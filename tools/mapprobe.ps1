
$root='D:\DSH-projects\paper-racing'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$prof = Join-Path $root 'shots\prof'
foreach ($ch in @('ch1','ch2','ch4','ch5')) {
  $url = 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#auto&ch=' + $ch + '&noin&diag&warp=20'
  $a = @('--headless=new','--no-sandbox','--disable-gpu','--enable-unsafe-swiftshader','--hide-scrollbars','--no-first-run',"--user-data-dir=$prof",'--window-size=1280,720','--virtual-time-budget=8000',('--screenshot=' + (Join-Path $root ('shots\m_' + $ch + '.png'))),$url)
  Start-Process -FilePath $chrome -ArgumentList $a -RedirectStandardOutput (Join-Path $root 'shots\m.out') -RedirectStandardError (Join-Path $root 'shots\m.err') -Wait -NoNewWindow | Out-Null
  Write-Output ('shot ' + $ch)
}
