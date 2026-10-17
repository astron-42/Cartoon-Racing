$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$prof='D:\DSH-projects\paper-racing\shots\prof5'
$out='D:\DSH-projects\paper-racing\shots'
function Shot($name, $hash, $budget) {
  & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir=$prof --window-size=1280,720 --virtual-time-budget=$budget --screenshot="$out\$name.png" "$base#$hash" 2>$null | Out-Null
  $f = Get-Item "$out\$name.png"
  "$name -> " + $f.Length + " bytes @ " + $f.LastWriteTime.ToString('HH:mm:ss')
}
Shot 'q1_select' 'select' 6000
Shot 'q2_ch4' 'press=3&noin&diag&warp=20' 12000
Shot 'q3_ch5' 'press=4&noin&diag&warp=20' 12000
Shot 'q4_ch8' 'press=7&noin&diag&warp=20' 12000
