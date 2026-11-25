# Servidor local para usar el panel sin internet. No requiere instalar nada.
# -Probar: atiende un solo pedido propio y termina (control rapido).
param([int]$Puerto = 8787, [switch]$Probar)

$raiz = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\') + '\'
$tipos = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8';
  '.json' = 'application/json; charset=utf-8'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg';
  '.webp' = 'image/webp'; '.svg' = 'image/svg+xml'; '.woff2' = 'font/woff2' }
$direccion = "http://localhost:$Puerto/"

$servidor = New-Object System.Net.HttpListener
$servidor.Prefixes.Add($direccion)
try { $servidor.Start() } catch {
  Write-Host "No se pudo abrir $direccion. Puede que el panel ya este abierto en otra ventana."
  if (-not $Probar) { Start-Process ($direccion + 'panel.html'); Start-Sleep -Seconds 8 }
  exit 1
}

function Responder($contexto) {
  $r = $contexto.Response
  try {
    $ruta = [Uri]::UnescapeDataString($contexto.Request.Url.AbsolutePath).TrimStart('/')
    if ($ruta -eq '') { $ruta = 'panel.html' }
    $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
    if ($archivo.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $archivo -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($archivo)
      $tipo = $tipos[[IO.Path]::GetExtension($archivo).ToLower()]
      if ($tipo) { $r.ContentType = $tipo }
      $r.Headers.Add('Cache-Control', 'no-cache')
      $r.ContentLength64 = $bytes.Length
      if ($contexto.Request.HttpMethod -ne 'HEAD') { $r.OutputStream.Write($bytes, 0, $bytes.Length) }
    } else { $r.StatusCode = 404 }
  } catch { } finally { try { $r.Close() } catch { } }
}

if ($Probar) {
  $cliente = New-Object System.Net.WebClient
  foreach ($p in 'panel.html', 'Placas%20LED%20FoCo%20v3.dc.html', 'panel/placas.json', 'vendor/react.js', 'no-existe.txt') {
    $tarea = $cliente.DownloadDataTaskAsync($direccion + $p)
    Responder ($servidor.GetContext())
    try { Write-Host "$p -> $($tarea.Result.Length) bytes" } catch { Write-Host "$p -> no se sirve" }
  }
  $servidor.Stop(); exit 0
}

Write-Host ""
Write-Host "  Panel de pantalla FoCo funcionando en $($direccion)panel.html"
Write-Host "  NO CIERRES ESTA VENTANA mientras uses el panel."
Write-Host ""
Start-Process ($direccion + 'panel.html')
while ($servidor.IsListening) { Responder ($servidor.GetContext()) }
