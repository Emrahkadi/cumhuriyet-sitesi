$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.15.6-hotspot"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
Set-Location "C:\Users\emrah\Desktop\android-sdk\cmdline-tools\latest\bin"

# Accept all licenses automatically
"y`ny`n" | & .\sdkmanager.bat --licenses 2>&1 | Out-Null

# Install required packages
.\sdkmanager.bat "platforms;android-35" "build-tools;35.0.0" 2>&1 | Out-String | Write-Host
