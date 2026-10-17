Set-Location 'D:\DSH-projects\paper-racing'
$node='C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
if (Test-Path '.tmpcheck') { Remove-Item -Recurse -Force '.tmpcheck' }
& $node tools/build.mjs 2>&1 | Select-Object -Last 2
'BUILD EXIT=' + $LASTEXITCODE
& $node --check dist/_bundle.js
'BUNDLE CHECK=' + $LASTEXITCODE
& $node tests/headless.test.mjs 2>&1 | Select-Object -Last 2
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$shots=@(
 @('c1_select','#select&diag',5000),
 @('c2_vehicle','#select&step=2&diag',5000),
 @('c3_race','#auto&noin&diag&warp=20',14000),
 @('c4_night','#auto&ch=ch4&noin&diag&warp=20',14000),
 @('c5_help','#help&diag',4000),
 @('c6_flow','#flow&diag',12000),
 @('c7_result','#auto&diag&warp=290',26000)
)
foreach ($s in $shots) {
  & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=$($s[2]) --screenshot="D:\DSH-projects\paper-racing\shots\$($s[0]).png" "$base$($s[1])" 2>$null | Out-Null
}
Get-ChildItem shots\c*_*.png | Select-Object Name,Length | Format-Table -AutoSize | Out-String -Width 120
(Get-Item dist/paper-racing.html).Length
