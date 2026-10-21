---
title: Information Security Handbook
department: IT Security
type: Handbook
revised: 2026-05-14
---

## Scope and responsibilities

This handbook sets out how the company protects the information it holds about its customers, its consignments and its people. It applies to all employees, contractors and third parties with access to the company systems, on any device, in any location.

Every employee is responsible for the security of the information they handle. The IT Security team owns the controls, the monitoring and the response, but it does not own the outcome on its own: most incidents begin with an ordinary action taken by someone who was not trying to cause harm. Line managers are responsible for ensuring their people complete security training within thirty days of joining and annually thereafter. System owners, named in the asset register, are responsible for access reviews and for keeping their systems patched.

## Information classification

Information is classified in four levels. Public information may be disclosed freely. Internal information may be shared inside the company without restriction but not outside it. Confidential information is restricted to those with a business need and is the default for customer data, commercial terms and personal data. Restricted information covers material whose disclosure would cause serious harm, including security credentials, unpublished financial results and live investigation material.

Classification is decided by the information's owner at the point of creation, and inherited by anything derived from it: an extract of a confidential dataset is confidential, and a summary of it usually is too. Where classification is unclear, treat the information as confidential until the owner says otherwise. Documents at confidential and above carry a classification label in the footer, and are not stored outside sanctioned systems.

## Access control and authentication

Access is granted on the principle of least privilege and on the basis of role. Requests are raised by the line manager, approved by the system owner and recorded. Access is reviewed quarterly for confidential systems and monthly for restricted ones, and revoked immediately on a change of role rather than at the next review.

Multi-factor authentication is mandatory for all remote access, all administrative accounts and all cloud services holding confidential data. Passwords must be at least fourteen characters and are not rotated on a schedule, because scheduled rotation drives predictable passwords; they are changed on suspicion of compromise. Credentials are stored in the company password manager and nowhere else. Accounts are never shared. Where a system genuinely cannot support individual accounts, the exception is registered, time-limited and compensated by additional logging.

## Handling customer and personal data

Customer consignment data, contact details and commercial terms are confidential by default. They are processed only in sanctioned systems, and are not copied into spreadsheets, personal drives or messaging tools for convenience. Extracts taken for analysis are minimised to the fields required and deleted when the analysis is complete.

Personal data is additionally governed by the data retention and privacy policy, which sets the lawful basis, the retention period and the rights of the individual. Transfers of personal data outside the European Economic Area require a transfer mechanism confirmed by Legal before the first transfer, not after it. Requests from an individual to access or erase their data are forwarded to the privacy mailbox on the day they are received, because the statutory clock starts on receipt by any part of the company, not on receipt by the right part of it.

## Devices, software and acceptable use

Company data is processed on company-managed devices. Devices are encrypted, enrolled in management, patched within fourteen days for high-severity vulnerabilities, and locked when unattended. Removable media is blocked by default; where a business case requires it, encrypted media is issued and registered.

Software is installed from the approved catalogue. Installing unapproved software, including browser extensions and developer tools that request broad permissions, requires an exception approved by IT Security. Company accounts must not be used to sign up to third-party services that process company data, including AI assistants, unless the service appears on the approved list. Personal use of company devices is permitted within reason and does not extend to storing personal media libraries, running personal businesses, or circumventing any control described in this handbook.

## Email, phishing and social engineering

Phishing remains the most common route into the company. Treat any message that creates urgency, asks for credentials, changes bank details, or asks you to break a process as suspicious regardless of who appears to have sent it. Report it with the report button rather than deleting it, so that the same message can be pulled from other mailboxes.

Changes to a customer's or supplier's bank details are never actioned on the basis of an email. They are verified by calling a number already held on file, not a number in the message, and confirmed by a second person in Finance. This control exists because the company has been targeted by invoice redirection attempts more than once, and the only reason none has succeeded is that someone picked up a telephone.

## Reporting a security incident

Anyone who suspects an incident reports it to the service desk immediately, including out of hours. An incident is any event that may have compromised the confidentiality, integrity or availability of company information: a lost device, a clicked link, a misdirected email containing customer data, an unexpected password prompt, a door left open.

Report first and investigate afterwards. Do not attempt to remediate on your own, do not delete evidence, and do not warn a suspected insider. No one has ever been disciplined at the company for reporting an incident they caused, and the policy is explicit about this because the cost of a late report is always higher than the cost of an embarrassing one. The response process itself is described in the incident response runbook.
