# Robot de tournage BeamUp — crée (ou met à jour) la tâche planifiée Windows hebdomadaire.
# Chaque mardi à 10 h, le robot filme, monte et envoie une vidéo à valider dans /pilotage.
# Si le PC est éteint à l'heure prévue, la tâche s'exécute au prochain démarrage.
#
# Utilisation :  powershell -ExecutionPolicy Bypass -File tools\video\planifier.ps1
# Suppression :  Unregister-ScheduledTask -TaskName "BeamUp - tournage hebdomadaire" -Confirm:$false

$ErrorActionPreference = 'Stop'
$frontend = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node).Source
$journal = Join-Path $PSScriptRoot 'sortie\journal.txt'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $journal) | Out-Null

$commande = "/c cd /d `"$frontend`" && `"$node`" tools\video\tournage.mjs >> `"$journal`" 2>&1"
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument $commande -WorkingDirectory $frontend
$declencheur = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Tuesday -At 10:00
$reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName 'BeamUp - tournage hebdomadaire' -Description 'Filme une partie de Chains & Crowns, monte la vidéo aux couleurs de BeamUp et la propose dans /pilotage.' `
  -Action $action -Trigger $declencheur -Settings $reglages -Force | Out-Null

Write-Output "Tâche planifiée : chaque mardi à 10 h (journal : $journal)"
