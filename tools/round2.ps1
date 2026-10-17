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
function Shot($url, $png, $budget, $dump) {
  $a = @('--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--hide-scrollbars','--no-first-run',"--user-data-dir=$root\shots\prof",'--window-size=1280,720',"--virtual-time-budget=$budget",("--screenshot=" + $root + "\shots\" + $png), $url)
  if ($dump) { $a += '--dump-dom' }
  $o = "$root\shots\" + $png + ".out"
  $p = Start-Process -FilePath $chrome -ArgumentList $a -Wait -PassThru -NoNewWindow -RedirectStandardOutput $o -RedirectStandardError "$root\shots\_e.txt"
  Write-Output ("shot " + $png + " exit=" + $p.ExitCode)
  if ($dump) {
    $dom = Get-Content $o -Raw
    $m = [regex]::Match($dom, '<div id="diag">([\s\S]*?)</div>')
    Write-Output ('diag[' + $png + ']: ' + $m.Groups[1].Value)
  }
}
Shot "$base#open" 'r2_open.png' 9000 $false
Shot "$base#select&diag" 'r2_select.png' 7000 $true
Shot "$base#records&diag" 'r2_records.png' 7000 $true
Shot "$base#auto&diag&warp=60" 'r2_mid.png' 12000 $true
Write-Output 'DONE'