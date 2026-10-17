Set-Location 'D:\DSH-projects\paper-racing'
$node = 'C:\Users\lll\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
& $node tools/build.mjs | Out-Null; "build=$LASTEXITCODE"
& $node --check dist/_bundle.js; "check=$LASTEXITCODE"
$out = & $node tests/headless.test.mjs 2>&1; $t = $LASTEXITCODE
$out | Set-Content -Encoding UTF8 tests_out.txt
$out | Select-String -Pattern 'FAIL|passed|total'
"tests=$t"
(Get-Item dist/paper-racing.html).Length
