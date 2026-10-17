Set-Location 'D:\DSH-projects\paper-racing'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$dom = & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=30000 --dump-dom "$base#flow&diag" 2>$null | Out-String
Set-Content -Path 'D:\DSH-projects\paper-racing\shots\dom.txt' -Value $dom -Encoding UTF8
'LEN=' + $dom.Length
$i = $dom.IndexOf('id="diag"')
if ($i -ge 0) { 'DIAGRAW: ' + $dom.Substring($i, 260) } else { 'no diag id' }