Set-Location 'D:\DSH-projects\paper-racing'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$shots=@(
 @('u5_n50','#auto&ch=ch2&diag&warp=50',14000),
 @('u5_n55','#auto&ch=ch2&diag&warp=55',15000),
 @('u5_d20','#auto&diag&warp=20',11000)
)
foreach ($s in $shots) {
  & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=$($s[2]) --screenshot="D:\DSH-projects\paper-racing\shots\$($s[0]).png" "$base$($s[1])" 2>$null | Out-Null
}
Get-ChildItem shots\u5_*.png | Select-Object Name,Length | Format-Table -AutoSize | Out-String -Width 120