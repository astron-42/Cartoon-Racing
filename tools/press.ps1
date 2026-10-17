
$node='C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
Set-Location 'D:\DSH-projects\paper-racing'
& $node tools/build.mjs 2>&1 | Select-Object -Last 2
'BUILD EXIT=' + $LASTEXITCODE
& $node --check dist/_bundle.js; 'CHECK=' + $LASTEXITCODE
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
foreach ($s in @(@('p1_ch1','#press=0&noin&diag&warp=20',26000), @('p2_ch4','#press=3&noin&diag&warp=20',26000), @('p3_ch8','#press=7&noin&diag&warp=20',26000))) {
  & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof3' --window-size=1280,720 --virtual-time-budget=$($s[2]) --screenshot="D:\DSH-projects\paper-racing\shots\$($s[0]).png" "$base$($s[1])" 2>$null | Out-Null
}
Get-ChildItem shots\p?_ch*.png | Select-Object Name,Length | Format-Table -AutoSize | Out-String -Width 100
