param(
  [string]$BaseUrl = "http://localhost",
  [string]$Token,
  [switch]$SkipUploadProbe,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "[STEP] $Message" -ForegroundColor Cyan
}

function Write-Pass {
  param([string]$Message)
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Yellow
}

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers,
    [object]$Body
  )

  if ($DryRun) {
    Write-Info "DRY-RUN $Method $Url"
    if ($Body -ne $null) {
      Write-Info "Body: $($Body | ConvertTo-Json -Depth 5 -Compress)"
    }
    return $null
  }

  $invokeParams = @{
    Method      = $Method
    Uri         = $Url
    Headers     = $Headers
    ContentType = "application/json"
  }

  if ($Body -ne $null) {
    $invokeParams["Body"] = ($Body | ConvertTo-Json -Depth 10)
  }

  try {
    return Invoke-RestMethod @invokeParams
  } catch {
    $statusCode = "n/a"
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }
    throw "Request failed ($Method $Url) status=$statusCode error=$($_.Exception.Message)"
  }
}

if (-not $DryRun -and [string]::IsNullOrWhiteSpace($Token)) {
  throw "Token is required unless -DryRun is set."
}

if (-not [string]::IsNullOrWhiteSpace($Token) -and $Token.StartsWith("Bearer ")) {
  $Token = $Token.Substring(7).Trim()
}

$headers = @{}
if (-not [string]::IsNullOrWhiteSpace($Token)) {
  $headers["Authorization"] = "Bearer $Token"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$title = "Smoke Test Post $timestamp"
$updatedTitle = "Smoke Test Post Updated $timestamp"
$content = "Created by smoke script at $timestamp"
$updatedContent = "Updated by smoke script at $timestamp"

$createdPost = $null

Write-Step "Probe public posts list"
$listUrl = "$BaseUrl/api/posts?page=1&limit=3"
$postsList = Invoke-Api -Method "GET" -Url $listUrl -Headers @{} -Body $null
if (-not $DryRun) {
  $count = 0
  if ($postsList -and $postsList.data) {
    $count = @($postsList.data).Count
  }
  Write-Pass "Posts list reachable (items=$count)"
}

if (-not $SkipUploadProbe) {
  Write-Step "Probe upload-url endpoint (auth required)"
  $uploadProbeUrl = "$BaseUrl/api/upload-url?filename=smoke-$timestamp.txt&contentType=text/plain"
  $uploadProbe = Invoke-Api -Method "GET" -Url $uploadProbeUrl -Headers $headers -Body $null
  if (-not $DryRun) {
    if (-not $uploadProbe.uploadUrl -or -not $uploadProbe.publicUrl) {
      throw "Upload probe response missing uploadUrl/publicUrl"
    }
    Write-Pass "upload-url endpoint returned signed URL"
  }
}

Write-Step "Create admin post"
$createUrl = "$BaseUrl/api/posts"
$createBody = @{
  title        = $title
  content      = $content
  thumbnailUrl = $null
}
$createdPost = Invoke-Api -Method "POST" -Url $createUrl -Headers $headers -Body $createBody
if (-not $DryRun) {
  if (-not $createdPost.id -or -not $createdPost.slug) {
    throw "Create response missing id/slug"
  }
  Write-Pass "Created post id=$($createdPost.id) slug=$($createdPost.slug)"
}

Write-Step "Update admin post"
$postId = if ($DryRun) { 999999 } else { [int]$createdPost.id }
$updateUrl = "$BaseUrl/api/posts/$postId"
$updateBody = @{
  title        = $updatedTitle
  content      = $updatedContent
  thumbnailUrl = $null
}
$updatedPost = Invoke-Api -Method "PUT" -Url $updateUrl -Headers $headers -Body $updateBody
if (-not $DryRun) {
  if (-not $updatedPost.title -or $updatedPost.title -ne $updatedTitle) {
    throw "Update verification failed: title mismatch"
  }
  Write-Pass "Updated post id=$postId"
}

Write-Step "Delete admin post"
$deleteUrl = "$BaseUrl/api/posts/$postId"
$null = Invoke-Api -Method "DELETE" -Url $deleteUrl -Headers $headers -Body $null
if (-not $DryRun) {
  Write-Pass "Deleted post id=$postId"
}

Write-Step "Final posts list check"
$finalList = Invoke-Api -Method "GET" -Url $listUrl -Headers @{} -Body $null
if (-not $DryRun) {
  $stillExists = $false
  if ($finalList -and $finalList.data) {
    $stillExists = @($finalList.data | Where-Object { $_.id -eq $postId }).Count -gt 0
  }
  if ($stillExists) {
    throw "Deleted post still visible in first page; verify ordering/page size if this persists."
  }
  Write-Pass "Final list check passed"
}

Write-Host ""
if ($DryRun) {
  Write-Host "Smoke script DRY-RUN completed successfully." -ForegroundColor Green
} else {
  Write-Host "Smoke script completed successfully." -ForegroundColor Green
}
