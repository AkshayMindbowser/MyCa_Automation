# Claude CLI PowerShell Alias Setup
# Add this to your PowerShell profile for permanent access

$claudePath = "$PSScriptRoot\claude-cli.js"

# Create a function that works globally
function claude {
    param([string]$query)
    if (-not $query) {
        Write-Host "Usage: claude `"Your question here`"" -ForegroundColor Yellow
        return
    }
    node $claudePath $query
}

# Make it available as a command
Export-ModuleMember -Function claude
