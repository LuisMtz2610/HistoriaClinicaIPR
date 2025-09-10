$ErrorActionPreference = "Stop"
$dupes = @(
  "app/(clinic)/prescriptions/[id]/print/page.tsx",
  "app/(clinic)/radiology-orders/[id]/print/page.tsx",
  "app/(clinic)/lab-orders/[id]/print/page.tsx",
  "app/(clinic)/consents/[id]/print/page.tsx",
  "app/(clinic)/prescriptions/new/page.tsx",
  "app/(clinic)/radiology-orders/new/page.tsx",
  "app/(clinic)/lab-orders/new/page.tsx",
  "app/(clinic)/consents/new/page.tsx",
  "app/(clinic)/prescriptions/page.tsx",
  "app/(clinic)/radiology-orders/page.tsx",
  "app/(clinic)/lab-orders/page.tsx",
  "app/(clinic)/consents/page.tsx"
)
foreach ($rel in $dupes) {
  $p = Join-Path (Get-Location) $rel
  if (Test-Path $p) {
    Remove-Item -LiteralPath $p -Force
    Write-Host "✂ eliminado: $rel"
  }
}
Write-Host "Listo. Reinicia tu dev server."
