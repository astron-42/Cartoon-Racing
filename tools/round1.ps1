$ErrorActionPreference = 'Continue'
$root = 'D:\DSH-projects\paper-racing'
$node = 'C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
Set-Location $root
& $node tools\build.mjs
Write-Output "build=$LASTEXITCODE"
& $node --check dist\_bundle.js
Write-Output "syntax=$LASTEXITCODE"
$pt = Start-Process -FilePath $node -ArgumentList 'tests\headless.test.mjs' -Wait -PassThru -NoNewWindow -RedirectStandardOutput "$root\tests\last.log" -RedirectStandardError "$root\tests\last.err"
Write-Output ("tests=" + $pt.ExitCode)
Get-Content "$root\tests\last.log" -Tail 2
$base = 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
function Shot($url, $png, $budget) {
  $a = @('--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--hide-scrollbars','--no-first-run',"--user-data-dir=$root\shots\prof",'--window-size=1280,720',"--virtual-time-budget=$budget",("--screenshot=" + $root + "\shots\" + $png), $url)
  $p = Start-Process -FilePath $chrome -ArgumentList $a -Wait -PassThru -NoNewWindow -RedirectStandardOutput "$root\shots\_o.txt" -RedirectStandardError "$root\shots\_e.txt"
  Write-Output ("shot " + $png + " exit=" + $p.ExitCode)
}
Shot "$base#open" 'r1_open.png' 9000
Shot "$base#auto&ch=ch2&warp=20" 'r1_ch2.png' 9000
Shot "$base#auto&warp=150" 'r1_end.png' 12000
$a = @('--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--no-first-run',"--user-data-dir=$root\shots\prof",'--window-size=1280,720','--virtual-time-budget=9000','--dump-dom',"$base#auto&ch=ch2&warp=20")
Start-Process -FilePath $chrome -ArgumentList $a -Wait -NoNewWindow -RedirectStandardOutput "$root\shots\dom_ch2.html" -RedirectStandardError "$root\shots\_e2.txt"
$dom = Get-Content "$root\shots\dom_ch2.html" -Raw
$m = [regex]::Match($dom, '<div id="diag">([\s\S]*?)</div>')
Write-Output ('diag: ' + $m.Groups[1].Value)
Write-Output 'DONE'