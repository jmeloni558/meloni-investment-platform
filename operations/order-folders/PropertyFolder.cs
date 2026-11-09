using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;
[assembly: AssemblyTitle("PropertyThesis Folder Opener")]
[assembly: AssemblyProduct("PropertyThesis Folder Opener")]
internal static class PropertyFolder {
    [STAThread]
    static void Main(string[] args) {
        try {
            if (args.Length != 1) throw new InvalidDataException("Invalid property folder link.");
            var match = Regex.Match(args[0], @"^pt-order-folder:([A-Za-z0-9_-]{1,12000})/?$", RegexOptions.IgnoreCase);
            if (!match.Success) throw new InvalidDataException("Invalid property folder link.");
            string encoded = match.Groups[1].Value.Replace('-', '+').Replace('_', '/');
            string path = new UTF8Encoding(false,true).GetString(Convert.FromBase64String(encoded.PadRight((encoded.Length+3)/4*4,'=')));
            string[] config = File.ReadAllLines(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "explorer-library.txt"));
            string prefix = config[1].TrimEnd('/') + "/";
            if (!path.StartsWith(prefix,StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Folder outside the property library.");
            string target = Path.GetFullPath(config[0]);
            foreach(string part in path.Substring(prefix.Length).Split('/')) {
                if (part.Length == 0 || part.EndsWith(".") || part.EndsWith(" ") || part.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 ||
                    Regex.IsMatch(part,@"^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\.|$)",RegexOptions.IgnoreCase))
                    throw new InvalidDataException("Invalid property folder name.");
                target = Path.Combine(target,part);
                var info = new DirectoryInfo(target);
                if (!info.Exists) throw new DirectoryNotFoundException("This folder has not synced to your PC: " + target);
                // OneDrive placeholders are legitimate reparse points. Refuse directory junctions and symlinks.
                if ((info.Attributes & FileAttributes.ReparsePoint) != 0 && IsNameSurrogate(target))
                    throw new InvalidDataException("This path redirects outside the synced folder tree.");
            }
            Process.Start(new ProcessStartInfo(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows),"explorer.exe"),
                "\"" + target + "\"") { UseShellExecute=false });
        } catch(Exception e) {
            MessageBox.Show(e.Message,"PropertyThesis Folder Opener",MessageBoxButtons.OK,MessageBoxIcon.Warning);
        }
    }
    [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential,CharSet=System.Runtime.InteropServices.CharSet.Unicode)]
    struct FindData {
        public uint attrs;
        public System.Runtime.InteropServices.ComTypes.FILETIME created,accessed,modified;
        public uint sizeHigh,sizeLow,tag,reserved;
        [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.ByValTStr,SizeConst=260)] public string name;
        [System.Runtime.InteropServices.MarshalAs(System.Runtime.InteropServices.UnmanagedType.ByValTStr,SizeConst=14)] public string alternate;
    }
    [System.Runtime.InteropServices.DllImport("kernel32.dll",CharSet=System.Runtime.InteropServices.CharSet.Unicode)]
    static extern IntPtr FindFirstFileW(string path,out FindData data);
    [System.Runtime.InteropServices.DllImport("kernel32.dll")]
    static extern bool FindClose(IntPtr handle);
    static bool IsNameSurrogate(string path) {
        FindData data;
        IntPtr handle=FindFirstFileW(path,out data);
        if(handle==new IntPtr(-1)) throw new IOException("Unable to verify the synced folder.");
        FindClose(handle);
        return (data.tag & 0x20000000u)!=0;
    }
}
