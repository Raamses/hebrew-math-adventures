---
trigger: always_on
---

# Security & Hard Constraints

## Deny List Logic
The following command prefixes are hard-blocked by the IDE. If you need to perform one of these actions:
1.  **Stop execution.**
2.  **Generate an Implementation Plan** explaining why the command is necessary.
3.  **Ask the user** to manually execute the command in the Editor View terminal.

## Blocked Prefixes
- **Destructive:** `rm -rf`, `mkfs`, `dd`
- **Privilege Escalation:** `sudo`, `chmod`, `chown`
- **External Deployment:** `git push`, `terraform apply`, `aws`, `gcloud`
- **Process Control:** `kill`, `shutdown`, `reboot`