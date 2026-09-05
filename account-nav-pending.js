// Reserve toolbar space until the account-aware navigation is ready.
// This is presentation only; it does not grant access or read credentials.
document.documentElement.classList.add('pt-account-nav-pending');
setTimeout(()=>document.documentElement.classList.remove('pt-account-nav-pending'),5000);
