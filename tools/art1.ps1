Set-Location 'D:\DSH-projects\paper-racing'
$node='C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
& $node tools/build.mjs; 'BUILD EXIT=' + $LASTEXITCODE
& $node --check dist/_bundle.js; 'BUNDLE CHECK=' + $LASTEXITCODE
& $node tests/headless.test.mjs 2>&1 | Select-Object -Last 3
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$shots=@(
 @('a1_menu','#open'), @('a1_select','#select'), @('a1_start','#auto&diag&warp=5'),
 @('a1_mid','#auto&diag&warp=22'), @('a1_ch2','#auto&ch=ch2&warp=20'),
 @('a1_end','#auto&warp=95'), @('a1_intro','#intro')
)
foreach ($s in $shots) {
  & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=9000 --screenshot="D:\DSH-projects\paper-racing\shots\$($s[0]).png" "$base$($s[1])" 2>$null | Out-Null
}
Get-ChildItem shots\a1_*.png | Select-Object Name,Length | Format-Table -AutoSize | Out-String -Width 120