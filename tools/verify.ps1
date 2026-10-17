# 打包 + 语法体检 + 无头浏览器实测 (截图与诊断)
$ErrorActionPreference = 'Continue'
$root = 'D:\DSH-projects\paper-racing'
$node = 'C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
Set-Location $root
New-Item -ItemType Directory -Force -Path "$root\shots" | Out-Null

Write-Output '--- 打包 ---'
& $node tools\build.mjs
Write-Output "build-exit=$LASTEXITCODE"
& $node --check dist\_bundle.js
Write-Output "syntax-exit=$LASTEXITCODE"

$profile = "$env:TEMP\pr-chrome-prof"
$url = 'file:///D:/DSH-projects/paper-racing/dist/paper-racing.html#auto'

Write-Output '--- 无头运行 (DOM 诊断) ---'
& $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --hide-scrollbars `
  --user-data-dir=$profile --window-size=1280,720 --virtual-time-budget=9000 --dump-dom $url 2>$null |
  Out-File -Encoding utf8 "$root\shots\dom.html"
$dom = Get-Content "$root\shots\dom.html" -Raw
$m = [regex]::Match($dom, '<div id="diag">([\s\S]*?)</div>')
if ($m.Success) { Write-Output ('DIAG: ' + $m.Groups[1].Value.Trim()) } else { Write-Output 'DIAG: <未找到 #diag>' }
Write-Output ('DOM 字节数: ' + $dom.Length)

Write-Output '--- 无头截图 ---'
& $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --hide-scrollbars `
  --user-data-dir=$profile --window-size=1280,720 --virtual-time-budget=9000 `
  --screenshot="$root\shots\race.png" $url 2>$null | Out-Null
if (Test-Path "$root\shots\race.png") {
  Write-Output ('截图: ' + (Get-Item "$root\shots\race.png").Length + ' bytes')
} else { Write-Output '截图失败' }
