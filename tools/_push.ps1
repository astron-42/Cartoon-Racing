Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class CredR5 {
  [StructLayout(LayoutKind.Sequential)] public struct CREDENTIAL {
    public int Flags; public int Type; public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob;
    public int Persist; public int AttributeCount; public IntPtr Attributes;
    public IntPtr TargetAlias; public IntPtr UserName;
  }
  [DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool CredRead(string target, uint type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr cred);
  public static string[] Read(string target) {
    IntPtr p; if (!CredRead(target,1,0,out p)) return new string[]{"ERR","",""};
    CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
    string u = Marshal.PtrToStringUni(c.UserName);
    string w = Marshal.PtrToStringUni(c.CredentialBlob, c.CredentialBlobSize/2);
    CredFree(p); return new string[]{"OK",u,w};
  }
}
'@ $null
$git = "D:\DSH-projects\.tools\git\cmd\git.exe"
& $git add -A | Out-Null
& $git status --porcelain
& $git -c user.name=astron-42 -c user.email=astron-42@users.noreply.github.com commit -q -m "docs: 添加 MIT LICENSE" -m "- 新增 LICENSE (MIT, Copyright (c) 2026 astron-42)" -m "- README 仓库段加许可证说明, THIRD_PARTY.md 顶部标明本项目自身许可"
Write-Output ("commit exit=" + $LASTEXITCODE)
& $git log --oneline -2
$c = [CredR5]::Read("git:https://github.com")
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($c[1] + ":" + $c[2]))
$env:GIT_TERMINAL_PROMPT = "0"
$p = & $git -c "http.sslVerify=false" -c "http.schannelCheckRevoke=false" -c "http.extraHeader=Authorization: Basic $b64" push origin main 2>&1
Write-Output ("push exit=" + $LASTEXITCODE)
$p | Select-Object -Last 4