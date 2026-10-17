
$root='D:\DSH-projects\paper-racing'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$node='C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
Set-Location $root
$prof = Join-Path $root 'shots\prof'
$base = 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$shots = @(
  @('f1_step1', '#select', 6000),
  @('f2_step2', '#select&step=2', 6000),
  @('f3_step3', '#select&step=3', 6000),
  @('f4_help',  '#help', 5000),
  @('f5_race',  '#auto&ch=ch1&rush&noin&diag&warp=45', 9000),
  @('f6_night', '#auto&ch=ch4&noin&diag&warp=30', 9000),
  @('f7_end',   '#auto&ch=ch1&noin&diag&warp=250', 9000)
)
foreach ($s in $shots) {
  $a = @('--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--hide-scrollbars','--no-first-run',"--user-data-dir=$prof",'--window-size=1280,720',"--virtual-time-budget=$($s[2])",('--screenshot=' + (Join-Path $root ('shots\' + $s[0] + '.png'))), ($base + $s[1]))
  Start-Process -FilePath $chrome -ArgumentList $a -RedirectStandardOutput (Join-Path $root ('shots\' + $s[0] + '.out')) -RedirectStandardError (Join-Path $root ('shots\' + $s[0] + '.err')) -Wait -NoNewWindow | Out-Null
  $p = Join-Path $root ('shots\' + $s[0] + '.png')
  if (Test-Path $p) { Write-Output ('OK ' + $s[0] + ' ' + (Get-Item $p).Length) } else { Write-Output ('MISS ' + $s[0]) }
}
