Set-Location 'D:\DSH-projects\paper-racing'
$node='C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
& $node tools/build.mjs; 'BUILD EXIT=' + $LASTEXITCODE
& $node --check dist/_bundle.js; 'BUNDLE CHECK=' + $LASTEXITCODE
& $node tests/headless.test.mjs 2>&1 | Select-Object -Last 2
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$shots=@(
 @('u1_cover','',9000), @('u1_s1','#select&step=1',9000), @('u1_s2','#select&step=2',9000),
 @('u1_s3','#select&step=3',12000), @('u1_s4','#select&step=4',9000),
 @('u1_mid','#auto&diag&warp=30',16000), @('u1_result','#auto&diag&warp=250',22000),
 @('u1_pause','#auto&diag&warp=30&pause',16000), @('u1_records','#records',9000)
)
foreach ($s in $shots) {
  & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=$($s[2]) --screenshot="D:\DSH-projects\paper-racing\shots\$($s[0]).png" "$base$($s[1])" 2>$null | Out-Null
}
Get-ChildItem shots\u1_*.png | Select-Object Name,Length | Format-Table -AutoSize | Out-String -Width 120
(Get-Item dist/paper-racing.html).Length