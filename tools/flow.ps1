Set-Location 'D:\DSH-projects\paper-racing'
$node='C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
$chrome='C:\Program Files\Google\Chrome\Application\chrome.exe'
& $node tools/build.mjs; 'BUILD EXIT=' + $LASTEXITCODE
& $node --check dist/_bundle.js; 'BUNDLE CHECK=' + $LASTEXITCODE
& $node tests/headless.test.mjs 2>&1 | Select-Object -Last 2
$base='file:///D:/DSH-projects/paper-racing/dist/paper-racing.html'
$dom = & $chrome --headless=new --no-sandbox --disable-gpu --enable-unsafe-swiftshader --user-data-dir='D:\DSH-projects\paper-racing\shots\prof' --window-size=1280,720 --virtual-time-budget=20000 --dump-dom "$base#flow&diag" 2>$null | Out-String
$m = [regex]::Match($dom, '<div id="diag">([\s\S]*?)</div>')
if ($m.Success) { 'DIAG: ' + $m.Groups[1].Value } else { 'DIAG NOT FOUND' }
$e = [regex]::Match($dom, 'TypeError[^<]{0,120}')
if ($e.Success) { 'ERR: ' + $e.Value } else { 'ERR: none' }