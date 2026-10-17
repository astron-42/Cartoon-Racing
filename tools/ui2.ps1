Set-Location 'D:\DSH-projects\paper-racing'
$node='C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
& $node tools/build.mjs; 'BUILD EXIT=' + $LASTEXITCODE
& $node --check dist/_bundle.js; 'BUNDLE CHECK=' + $LASTEXITCODE
& $node tests/headless.test.mjs 2>&1 | Select-Object -Last 2
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$shots=@(
 @('u2_cover','',9000), @('u2_s1','#select&step=1',9000), @('u2_s3','#select&step=3',12000),
 @('u2_s4','#select&step=4',9000), @('u2_mid','#auto&diag&warp=30',16000)
)
foreach ($s in $shots) {
  & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=$($s[2]) --screenshot="D:\DSH-projects\paper-racing\shots\$($s[0]).png" "$base$($s[1])" 2>$null | Out-Null
}
Get-ChildItem shots\u2_*.png | Select-Object Name,Length | Format-Table -AutoSize | Out-String -Width 120