param([string]$ConfigFile = (Join-Path $PSScriptRoot 'settings.json'))
$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigFile -Raw | ConvertFrom-Json
$root = [IO.DirectoryInfo]$config.root
if (!$root.Exists) { throw 'The configured OneDrive BPO folder is unavailable.' }

function SafeName([string]$Value) {
    $name = ($Value -replace '[<>:"/\\|?*\x00-\x1f]', '-').Trim().TrimEnd('.',' ')
    if (!$name -or $name -in '.', '..' -or $name.Length -gt 255) { throw 'Invalid OneDrive folder name.' }
    if ($name -match '^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\.|$)') { $name = '_' + $name }
    return $name
}

function OrderParent($Job) {
    $alias = $config.aliases.PSObject.Properties[$Job.client]
    $parts = if ($alias) { $alias.Value -split '/' } else { @(SafeName $Job.client) }
    $folder = $root.FullName
    foreach ($part in $parts) { $folder = Join-Path $folder (SafeName $part) }
    $direction = switch ($Job.kind) {
        'Int BPO' {'Interior'} 'Ext BPO' {'Exterior'} 'Desktop BPO' {'Desktop'}
        'Int PCR' {'Interior'} 'Ext PCR' {'Exterior'} 'PDCR' {''} default {throw 'Unsupported order type.'}
    }
    $children = @()
    if ([IO.Directory]::Exists($folder)) { $children = @(Get-ChildItem -Directory -LiteralPath $folder) }
    $names = @($children | ForEach-Object Name)
    if ($Job.kind -eq 'PDCR') {
        foreach ($n in 'Property Data Collection Reports','Data Collection Reports') { if ($names -contains $n) {return Join-Path $folder $n} }
    } elseif ($Job.kind -like '*BPO') {
        foreach ($n in "$direction BPOs",$direction) { if ($names -contains $n) {return Join-Path $folder $n} }
        if ($names -contains 'BPOs') {
            $group = Join-Path $folder 'BPOs'
            if (@(Get-ChildItem -Directory -LiteralPath $group | Where-Object Name -in 'Interior','Exterior','Desktop').Count) {return Join-Path $group $direction}
            return $group
        }
        if (@($names | Where-Object {$_ -match '^(Interior|Exterior|Desktop) BPOs$'}).Count) { return Join-Path $folder "$direction BPOs" }
    } else {
        $groupName = $names | Where-Object {$_ -match '^(Property\s+(Condition|Inspection)\s+Reports|Market Analysis and Condition Reports)$'} | Select-Object -First 1
        if ($groupName) {
            $group = Join-Path $folder $groupName
            if (@(Get-ChildItem -Directory -LiteralPath $group | Where-Object Name -in 'Interior','Exterior').Count) {return Join-Path $group $direction}
            return $group
        }
    }
    $years = @($names | Where-Object {$_ -match '^20[0-9]{2}$'} | Sort-Object -Descending)
    if ($years.Count -and !($names -match '^\d+\s')) {
        $yearFolder = Join-Path $folder (Get-Date -Format yyyy)
        $previousYear = Join-Path $folder $years[0]
        if ($direction -and @(Get-ChildItem -Directory -LiteralPath $previousYear | Where-Object Name -in 'Interior','Exterior','Desktop').Count) {
            return Join-Path $yearFolder $direction
        }
        return $yearFolder
    }
    if ($names -match '^\d+\s' -or $parts.Count -gt 1) {return $folder}
    if ($Job.kind -eq 'PDCR') {return Join-Path $folder 'Data Collection Reports'}
    if ($Job.kind -like '*PCR') {return Join-Path (Join-Path $folder 'Property Condition Reports') $direction}
    return Join-Path $folder "$direction BPOs"
}

$drive = Get-ItemProperty 'HKCU:/Software/Microsoft/OneDrive/Accounts/Business*' | Where-Object {
    $_.UserFolder -and $root.FullName.StartsWith($_.UserFolder.TrimEnd('\')+'\',[StringComparison]::OrdinalIgnoreCase)
} | Select-Object -First 1
if (!$drive.ServiceEndpointUri) {throw 'Cannot identify the synced OneDrive library.'}
$site = $drive.ServiceEndpointUri -replace '/_api/?$',''
function FolderUrl([string]$Path) {
    $relative = $Path.Substring($drive.UserFolder.TrimEnd('\').Length).Replace('\','/')
    $libraryPath = ([uri]$site).AbsolutePath.TrimEnd('/')+'/Documents'+$relative
    return $site+'/_layouts/15/onedrive.aspx?id='+[uri]::EscapeDataString($libraryPath)
}

$secure = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'worker.key') | ConvertTo-SecureString
$key = [Net.NetworkCredential]::new('', $secure).Password
function Rpc([string]$Name, [hashtable]$Body) {
    $Body.worker_key = $key
    Invoke-RestMethod -Method Post -Uri ($config.api + '/rest/v1/rpc/' + $Name) -Headers @{apikey=$config.publishable} -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Compress))) -TimeoutSec 20
}
for ($i=0; $i -lt 50; $i++) {
    $job = Rpc 'next_order_folder' @{}
    if (!$job.id) {break}
    $failure = $null
    try {
        $target = [IO.Path]::GetFullPath((Join-Path (OrderParent $job) (SafeName $job.address)))
        if (!$target.StartsWith($root.FullName+'\',[StringComparison]::OrdinalIgnoreCase)) {throw 'Invalid destination.'}
        if (!$job.lookup_only) {[void][IO.Directory]::CreateDirectory($target)}
        $link = if ([IO.Directory]::Exists($target)) {FolderUrl $target} else {$null}
        Rpc 'record_order_folder' @{job_id=$job.id;folder_link=$link} | Out-Null
    } catch { $failure = $_.Exception.Message }
    if ($failure) {Rpc 'finish_order_folder' @{job_id=$job.id;failure=$failure} | Out-Null}
}
