$port = 9090
$baseDir = 'c:\Users\mdwin\Downloads\99_Vibe_Coding\kakao_Analyze'
$logFile = Join-Path $baseDir "server.log"

function Write-Log($msg) {
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "[$time] $msg" | Out-File -FilePath $logFile -Append -Encoding utf8
}

Write-Log "Starting server on port $port..."

try {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
    $listener.Start()
    Write-Log "Server listening on http://0.0.0.0:$port"
} catch {
    Write-Log "오류 (시작 실패): $_"
    exit 1
}

function Get-ContentType($ext) {
    switch ($ext) {
        ".html" { return "text/html; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".js"   { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".txt"  { return "text/plain; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".ico"  { return "image/x-icon" }
        default { return "application/octet-stream" }
    }
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $clientIP = $client.Client.RemoteEndPoint.ToString()
        Write-Log "Connection from $clientIP"
        
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        
        $requestLine = $reader.ReadLine()
        if ($null -eq $requestLine) {
            $client.Close()
            continue
        }
        
        $parts = $requestLine -split " "
        if ($parts.Length -lt 2) {
            $client.Close()
            continue
        }
        
        $method = $parts[0]
        $urlPath = $parts[1]
        
        if ($urlPath.Contains("?")) {
            $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("?"))
        }
        
        if ($urlPath -eq "/" -or $urlPath -eq "") { $urlPath = "/index.html" }
        $relative = [System.Uri]::UnescapeDataString($urlPath.TrimStart("/"))
        $filePath = Join-Path $baseDir $relative.Replace("/", "\")
        
        Write-Log "$method $urlPath"
        
        if (Test-Path -Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = Get-ContentType $ext
            
            $header = "HTTP/1.1 200 OK`r`n" +
                      "Content-Type: $contentType`r`n" +
                      "Content-Length: $($bytes.Length)`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Connection: close`r`n`r`n"
            
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            $errMsg = "Not found: $urlPath"
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
            
            $header = "HTTP/1.1 404 Not Found`r`n" +
                      "Content-Type: text/plain; charset=utf-8`r`n" +
                      "Content-Length: $($errBytes.Length)`r`n" +
                      "Connection: close`r`n`r`n"
            
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($errBytes, 0, $errBytes.Length)
        }
        
        $stream.Close()
        $client.Close()
    }
} catch {
    Write-Log "오류 (루프): $_"
} finally {
    if ($null -ne $listener) {
        $listener.Stop()
    }
    Write-Log "Server stopped."
}
