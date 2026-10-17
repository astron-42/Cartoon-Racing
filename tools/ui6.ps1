Set-Location 'D:\DSH-projects\paper-racing'
$node='C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
& $node tools/build.mjs; 'BUILD EXIT=' + $LASTEXITCODE
& $node --check dist/_bundle.js; 'BUNDLE CHECK=' + $LASTEXITCODE
& $node tests/headless.test.mjs 2>&1 | Select-Object -Last 2
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$shots=@(
 @('v1_help','#help&diag',4000),
 @('v1_records','#records&diag',4000),
 @('v1_pause','#auto&diag&warp=10&pause',9000),
 @('v1_step2','#select&step=2&diag',4000)
)
foreach ($s in $shots) {
  & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=$($s[2]) --screenshot="D:\DSH-projects\paper-racing\shots\$($s[0]).png" "$base$($s[1])" 2>$null | Out-Null
}
$dom = & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=30000 --dump-dom "$base#flow&diag" 2>$null | Out-String
$j = $dom.IndexOf('flow OK')
if ($j -ge 0) { 'FLOW: ' + $dom.Substring($j, 96) } else { 'FLOW: not found' }
Get-ChildItem shots\v1_*.png | Select-Object Name,Length | Format-Table -AutoSize | Out-String -Width 120