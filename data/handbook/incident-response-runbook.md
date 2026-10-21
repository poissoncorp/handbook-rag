---
title: Security Incident Response Runbook
department: IT Security
type: Runbook
revised: 2026-05-14
---

## When this runbook applies

This runbook is followed for any confirmed or suspected security incident affecting the company systems or data. It applies from the moment a report is received, whether from an employee, a monitoring alert, a customer, a supplier or an external researcher.

It does not apply to routine service faults with no security dimension, which follow the standard service desk process. Where it is unclear whether an event is a fault or an incident, it is treated as an incident until the duty responder establishes otherwise. Misclassifying a fault as an incident costs an hour of effort. Misclassifying an incident as a fault has cost other companies their quarter.

## Severity levels

Severity one covers incidents with active unauthorised access to production systems, confirmed exfiltration of confidential data, ransomware, or loss of a service that halts terminal operations. Severity two covers credible indicators of compromise without confirmed access, loss of a device holding confidential data, or exposure of personal data affecting more than fifty individuals.

Severity three covers isolated events with contained impact: a single phishing click with no credential entry, a misdirected email to a known recipient, a vulnerability disclosed with no evidence of exploitation. Severity is set by the duty responder within thirty minutes of triage and is reassessed at every update. Severity is raised freely and lowered only with the incident manager's agreement, recorded with the reason.

## Roles during an incident

The incident manager coordinates, decides, and is the single point of authority for the duration. This is a role, not a rank: the incident manager may be more junior than people taking direction from them, and the arrangement holds until the incident is closed.

The technical lead directs investigation and containment. The communications lead handles all internal and external messaging, including to customers and regulators, and is the only person who does. The scribe maintains the timeline, recording every action, decision and observation with a timestamp, because reconstruction after the fact is unreliable and the timeline is what the post-incident review, the insurer and any regulator will read. For severity one, all four roles are filled by different people.

## Triage and the first hour

On receipt of a report, the duty responder confirms the report is genuine, establishes what systems and data are in scope, and sets an initial severity. For severity one and two, the incident manager is paged immediately and a dedicated channel and bridge are opened within fifteen minutes.

The first hour prioritises evidence preservation and scope, not remediation. Take memory and disk images before rebuilding anything. Preserve logs by extending retention on the affected sources before they roll. Identify which accounts, hosts and data are implicated, and identify what is still exposed. Resist the instinct to reset every password and rebuild every host in the first hour: it destroys the evidence needed to work out whether the intruder still has access by another route.

## Containment, eradication and recovery

Containment limits further damage while preserving the ability to investigate. Typical actions are isolating hosts at the network level rather than powering them off, disabling rather than deleting accounts, revoking sessions and tokens, and blocking command-and-control destinations. Each containment action is recorded with the time it took effect.

Eradication removes the intruder's access and the mechanism that allowed it: credentials rotated, persistence removed, the vulnerability patched. Recovery restores service from a known-good state, verifies integrity, and monitors intensively for recurrence for at least fourteen days. An incident is not closed at the point service is restored. It is closed when the entry route is understood and remediated, and the incident manager says so in writing.

## Notification and external communication

The company notifies affected customers where their data or consignments are implicated, and does so with facts rather than reassurance. The communications lead drafts, Legal reviews, and the incident manager approves. Nobody else communicates externally about an incident, including in general terms, including on social media.

Where personal data is involved, Legal assesses the notification obligation immediately, because the statutory window for notifying a supervisory authority is seventy-two hours from becoming aware and is not paused while the investigation continues. Where a criminal offence is suspected, the incident manager and Legal decide jointly whether to involve law enforcement. Cyber insurance is notified as soon as a severity one or two is declared, since late notification can void cover regardless of the merits.

## Post-incident review

A written review is completed within ten working days of closure for severity one and two, and within twenty for severity three where the incident manager judges it useful. It is circulated to the affected system owners, the security team and the executive sponsor.

The review establishes the timeline, the entry route, what worked, what did not, and what will change, with named owners and dates for each action. It is blameless in the specific sense that it does not attribute an incident to an individual's error: if a single click could cause it, the control failed, not the person. Actions from the review are tracked to completion in the same register as audit findings, and are reported monthly until closed.
