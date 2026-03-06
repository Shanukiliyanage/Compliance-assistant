// Inline recommendation lookup for No/Partial answers during the assessment.
// Keys are normalised to match backend recommendationRules.js format.
// Source: mirrors backend/rules/recommendationRules.js.
// {orgName} placeholders are substituted with "Your organisation".

const R = {
  // ── Stage 1 – Mandatory Clauses ────────────────────────────────────────────
  "4.1": {
    no: "Your organisation should document its business purpose and strategic direction, and identify the key internal and external issues that affect information security (e.g., regulatory, market, technology, organisational changes). Review and update this when significant changes occur.",
    partial: "Your organisation should complete its documentation of business context by capturing missing internal/external issues, clarifying impacts on information security, assigning ownership, and reviewing it regularly (and when things change).",
  },
  "4.2": {
    no: "Your organisation should list all key stakeholders (customers, regulators, partners, employees) and write down what each expects for information security (laws, contracts, privacy, service requirements). Keep this list updated.",
    partial: "Your organisation should complete the stakeholder list and fill missing expectations. Make sure the requirements are clear, owned by someone, and reviewed regularly.",
  },
  "4.3": {
    no: "Your organisation should document what is included in the ISMS (sites, systems, data, and processes) and what is excluded (with a clear reason). Share this scope with the people responsible for security.",
    partial: "Your organisation should make the scope clearer and more complete (what's in/out, key systems and data, third parties). Keep it controlled and updated when the business or IT changes.",
  },
  "5.1": {
    no: "Your organisation should have top management actively support security by approving the security direction, assigning clear responsibility, providing budget/time/tools, and reviewing security performance regularly.",
    partial: "Your organisation should make management support more consistent by setting a regular review (e.g., quarterly), recording decisions/actions, and following up until actions are completed.",
  },
  "5.2": {
    no: "Your organisation should create a simple Information Security Policy, get it approved by management, and share it with all employees (including new joiners). Keep one owner and a review date.",
    partial: "Your organisation should update the policy to reflect how the organisation actually operates, make sure employees receive and acknowledge it, and review it at least yearly or after major changes.",
  },
  "5.3": {
    no: "Your organisation should clearly assign and document information security roles and responsibilities (e.g., who owns security, who approves access, who handles incidents) and communicate them to the relevant people.",
    partial: "Your organisation should remove role confusion by documenting ownership for each key security task, defining escalation paths, and ensuring people understand their responsibilities.",
  },
  "6.1": {
    no: "Your organisation should create a repeatable risk assessment method: list key assets, identify threats and weaknesses, and rate impact and likelihood. Record results in a risk register.",
    partial: "Your organisation should make risk assessments consistent by using one method across all areas, keeping records, and reassessing when major changes happen (new systems, suppliers, incidents).",
  },
  "6.2": {
    no: "Your organisation should document how each major risk will be handled (accept/mitigate/transfer/avoid) and list the exact controls or actions to implement, with an owner and deadline.",
    partial: "Your organisation should improve risk treatment by ensuring every risk has a clear decision, mapped actions/controls, tracked progress, and evidence when actions are completed (including approvals for accepted risks).",
  },
  "7.1": {
    no: "Your organisation should run basic security training for all staff during onboarding and at least yearly (phishing, passwords, data handling, incident reporting). Track attendance.",
    partial: "Your organisation should improve training by covering all staff consistently, refreshing it regularly, and checking understanding (short quiz or phishing simulation). Keep records.",
  },
  "7.2": {
    no: "Your organisation should clearly define who owns security, who manages access, and who handles incidents. Document these responsibilities and tell the relevant people.",
    partial: "Your organisation should remove role confusion by documenting ownership for each key security task, setting escalation paths, and ensuring staff understand their responsibilities.",
  },
  "7.3": {
    no: "Your organisation should maintain a competency/skills record for information security roles, define required competencies, assess current gaps, and provide training or support. Keep evidence of competence (training records, experience).",
    partial: "Your organisation should improve competence management by completing the competency record for all relevant roles, addressing identified gaps with training, and periodically reviewing competence as systems and threats change.",
  },
  "8.1": {
    no: "Your organisation should document and implement basic procedures for access control, backups/restore, incident handling, and change management (who does what, when, and how).",
    partial: "Your organisation should complete missing procedures and standardize how they are followed across teams and systems, not only in some areas.",
  },
  "8.2": {
    no: "Your organisation should ensure day-to-day use of procedures by keeping evidence such as tickets, approvals, backup logs, restore test results, incident records, and change records.",
    partial: "Your organisation should improve consistency by collecting evidence every time, reviewing it regularly, and fixing repeated gaps (e.g., missing approvals, untested restores).",
  },
  "9.1": {
    no: "Your organisation should run internal reviews/audits at least annually, document findings, and track corrective actions until completed.",
    partial: "Your organisation should make reviews more effective by using a plan, covering all key areas, documenting evidence, and verifying corrective actions are completed and working.",
  },
  "9.2": {
    no: "Your organisation should hold regular management reviews of security performance (incidents, audits, key metrics) and decide actions with owners and deadlines.",
    partial: "Your organisation should improve management review by recording decisions, tracking actions to completion, and reviewing trends (repeat incidents/issues) to prevent recurrence.",
  },
  "10.1": {
    no: "Your organisation should log incidents and audit findings, assign corrective actions (owner + due date), and track them until they are completed and checked for effectiveness.",
    partial: "Your organisation should improve corrective actions by doing basic root-cause checks, prioritising high-risk issues, and confirming the fix actually prevents the issue from happening again.",
  },
  "10.2": {
    no: "Your organisation should set a regular improvement review (e.g., quarterly) to identify what to improve based on incidents, audits, risks, and feedback — then implement and track those improvements.",
    partial: "Your organisation should make improvement more structured by keeping an improvement list, assigning owners/dates, and confirming improvements are completed and measurable.",
  },

  // ── Stage 2 – Organisational Controls (Annex A.5) ──────────────────────────
  "A.5.1.Q1": {
    no: "Your organisation should create a clear Information Security Policy, get management approval, publish it to all staff (including new joiners), and assign an owner and review date.",
    partial: "Your organisation should update the policy to match how the organisation operates, ensure everyone receives and acknowledges it, and confirm it is consistently applied across teams.",
  },
  "A.5.1.Q2": {
    no: "Your organisation should set a regular review cycle (at least annually and after major changes/incidents), re-approve the policy, and keep version history and evidence of review.",
    partial: "Your organisation should make reviews consistent by using a schedule, recording review outcomes/actions, and tracking updates to completion.",
  },
  "A.5.2.Q1": {
    no: "Your organisation should define key security responsibilities (governance, risk, access, incident handling, supplier security) and assign named owners for each.",
    partial: "Your organisation should clarify remaining gaps/overlaps, confirm accountability for key tasks, and define escalation paths.",
  },
  "A.5.2.Q2": {
    no: "Your organisation should document responsibilities (e.g., RACI) and communicate them to staff/teams, including what to do for approvals, exceptions, and incident reporting.",
    partial: "Your organisation should ensure documentation is up to date, accessible, and understood by all relevant roles, with periodic refresh and evidence of communication.",
  },
  "A.5.3.Q1": {
    no: "Your organisation should identify high-risk activities (payments, admin changes, access approvals, code releases) and enforce separation (maker-checker, dual approval, independent review).",
    partial: "Your organisation should expand segregation to all critical processes, formalise approval workflows, and periodically review exceptions and conflicts.",
  },
  "A.5.4.Q1": {
    no: "Your organisation should make managers accountable for enforcing key security practices (training completion, acceptable use, access approvals, secure handling) and include this in routine team oversight.",
    partial: "Your organisation should standardise how managers monitor and reinforce security (checklists, periodic reviews, follow-up on non-compliance).",
  },
  "A.5.4.Q2": {
    no: "Your organisation should implement a clear process for managers to log, investigate, and resolve security issues with deadlines, ownership, and escalation if delayed.",
    partial: "Your organisation should improve consistency by tracking actions to closure, recording evidence of fixes, and reviewing repeat issues to prevent recurrence.",
  },
  "A.5.5.Q1": {
    no: "Your organisation should define which authorities, regulators, or law enforcement contacts may be needed, maintain an up-to-date contact list, assign an owner and review cycle, and link it to the incident response plan.",
    partial: "Your organisation should keep the list current (owners + review cycle), and ensure relevant staff know when and how to engage authorities.",
  },
  "A.5.6.Q1": {
    no: "Your organisation should identify relevant communities (industry groups, CERT/CSIRT feeds, vendor security advisories) and assign someone to monitor and share relevant updates.",
    partial: "Your organisation should make participation effective by defining what is monitored, how updates are triaged, and how learnings feed into risk and controls.",
  },
  "A.5.7.Q1": {
    no: "Your organisation should set up a basic threat intelligence process (sources + frequency), assess relevance, and convert key items into actions (patching, alerts, user warnings, risk updates).",
    partial: "Your organisation should improve by documenting the process, ensuring regular review, and keeping evidence of decisions/actions taken.",
  },
  "A.5.8.Q1": {
    no: "Your organisation should embed security in projects (requirements, architecture review, secure configuration, data classification, access design) from the start.",
    partial: "Your organisation should ensure security is applied to all projects consistently, not just some, and define clear security checkpoints in the project lifecycle.",
  },
  "A.5.8.Q2": {
    no: "Your organisation should perform a simple project risk assessment before implementation (data, access, supplier/cloud use, change impact) and record outcomes and required controls.",
    partial: "Your organisation should standardise the assessment method, keep records, and verify required controls are implemented before go-live.",
  },
  "A.5.9.Q1": {
    no: "Your organisation should create and maintain an asset inventory covering key systems, devices, applications, data sets, and owners (including criticality and where data is stored).",
    partial: "Your organisation should complete missing assets/owners, define minimum required fields, and reconcile inventory against reality periodically.",
  },
  "A.5.10.Q1": {
    no: "Your organisation should create an Acceptable Use Policy covering devices, email, internet, data handling, prohibited actions, and reporting requirements, and publish it to staff.",
    partial: "Your organisation should update the AUP to reflect actual working practices (remote work, BYOD, cloud tools), and ensure it is consistently enforced.",
  },
  "A.5.10.Q2": {
    no: "Your organisation should implement acknowledgement (signed or electronic) during onboarding and periodic refresh, and keep records for audit/compliance.",
    partial: "Your organisation should ensure acknowledgements cover all staff/contractors, are renewed when policies change, and are monitored for completion.",
  },
  "A.5.11.Q1": {
    no: "Your organisation should implement a formal leaver/mover process to recover assets and remove access promptly (accounts, keys, badges, devices), with a checklist and owner.",
    partial: "Your organisation should make this consistent across teams by standardising the process, integrating HR/IT triggers, and reviewing exceptions and delays.",
  },
  "A.5.12.Q1": {
    no: "Your organisation should define a simple classification scheme and handling rules (storage, sharing, encryption, retention) and assign owners for key data sets.",
    partial: "Your organisation should expand coverage to all important information, align classification with real risk/legal requirements, and check consistency across teams.",
  },
  "A.5.12.Q2": {
    no: "Your organisation should define how email is classified/handled (labels, warnings, encryption rules), and train staff to apply the rules consistently.",
    partial: "Your organisation should improve consistency by using standardised labels/templates and (where feasible) technical enforcement for sensitive email sharing.",
  },
  "A.5.13.Q1": {
    no: "Your organisation should implement labelling aligned to classification (documents, email, storage) and define clear instructions for use and required protections.",
    partial: "Your organisation should close gaps by ensuring labelling is used across key tools (email/docs/storage) and reinforcing correct handling through training and checks.",
  },
  "A.5.14.Q1": {
    no: "Your organisation should define approved transfer methods and protections (secure sharing tools, encryption, access controls, approvals for high-risk transfers) and implement monitoring where appropriate.",
    partial: "Your organisation should standardise controls across channels (email, file sharing, cloud links, removable media), tune DLP/monitoring, and review repeated leak patterns.",
  },
  "A.5.14.Q2": {
    no: "Your organisation should implement email controls for sensitive data (labelling, encryption, restricted sharing, warnings/approvals, blocking risky recipients/attachments where needed).",
    partial: "Your organisation should improve enforcement and consistency (coverage for all users, clear exceptions, monitoring and periodic review of email leakage risks).",
  },
  "A.5.15.Q1": {
    no: "Your organisation should implement least-privilege access with approvals, role-based access where possible, and removal of access when no longer needed.",
    partial: "Your organisation should tighten high-risk access, ensure controls apply across all systems, and keep evidence of approvals and periodic reviews.",
  },
  "A.5.16.Q1": {
    no: "Your organisation should implement a joiner/mover/leaver identity process with unique accounts, approvals, timely deprovisioning, and periodic checks for orphaned accounts.",
    partial: "Your organisation should standardise the process across all systems (including SaaS), improve timeliness, and automate provisioning/deprovisioning where feasible.",
  },
  "A.5.17.Q1": {
    no: "Your organisation should define authentication standards (strong passwords, MFA for critical systems, secure resets, no sharing) and enforce them technically where possible.",
    partial: "Your organisation should expand MFA coverage, strengthen reset processes, and ensure standards are consistently enforced across all systems and privileged accounts.",
  },
  "A.5.18.Q1": {
    no: "Your organisation should implement regular access reviews (especially privileged and sensitive-data access), document decisions, and remove unnecessary access promptly with evidence.",
    partial: "Your organisation should improve review consistency and coverage across all key systems, track removals to closure, and report recurring issues.",
  },
  "A.5.19.GW1": {
    no: "Your organisation should confirm whether external suppliers can access its information or systems. If yes, identify them and complete supplier security controls (A.5.19–A.5.22). If truly no, document the rationale and review periodically.",
    partial: "Your organisation should complete an inventory of external suppliers with IT access, confirm which are in scope, and ensure supplier controls (A.5.19–A.5.22) are applied consistently.",
  },
  "A.5.19.Q1": {
    no: "Your organisation should confirm whether external suppliers can access its information or systems. If yes, identify them and complete supplier security controls (A.5.19–A.5.22). If truly no, document the rationale and review periodically.",
    partial: "Your organisation should complete an inventory of external suppliers with IT access, confirm which are in scope, and ensure supplier controls (A.5.19–A.5.22) are applied consistently.",
  },
  "A.5.19.Q2": {
    no: "Your organisation should establish a supplier security process: identify in-scope suppliers, assess risks before onboarding, define required controls, control supplier access, and assign an owner for oversight.",
    partial: "Your organisation should make supplier risk management consistent by using a standard assessment, tracking remediation actions, reviewing supplier access regularly, and re-assessing on major changes.",
  },
  "A.5.20.Q1": {
    no: "Your organisation should update supplier contracting to include minimum security clauses (confidentiality, data protection, access controls, incident notification, subcontractor controls, secure termination, assurance/audit rights as appropriate).",
    partial: "Your organisation should standardise clauses by supplier risk level, close missing requirements in existing contracts, and maintain a review cycle to keep terms current.",
  },
  "A.5.21.Q1": {
    no: "Your organisation should implement vendor security assessments for relevant IT suppliers (questionnaires + evidence), set minimum control expectations, and require remediation before granting access.",
    partial: "Your organisation should apply assessments consistently, perform deeper reviews for high-risk suppliers, and track remediation actions and re-assessments over time.",
  },
  "A.5.22.Q1": {
    no: "Your organisation should implement periodic supplier reviews (performance, incidents, access, assurance evidence) and define actions/escalation when requirements are not met.",
    partial: "Your organisation should make reviews consistent with a schedule, retain evidence of reviews/decisions, and track follow-up actions to completion.",
  },
  "A.5.23.Q1": {
    no: "Your organisation should confirm whether any cloud services are used (including SaaS like email, file storage, CRM). If yes, complete cloud security controls and governance. If no, document the rationale and review periodically.",
    partial: "Your organisation should complete an inventory of cloud services in use, confirm which are in scope, and ensure cloud security controls are applied consistently to all in-scope services.",
  },
  "A.5.23.Q2": {
    no: "Your organisation should assess cloud risks (shared responsibility, data location, access, logging, supplier assurance) and implement cloud governance (secure configuration baselines, IAM, monitoring, incident handling).",
    partial: "Your organisation should standardise cloud risk assessments, improve configuration and access governance, and continuously monitor cloud security posture and supplier assurance.",
  },
  "A.5.24.Q1": {
    no: "Your organisation should define and document an incident management approach (roles, reporting, triage, escalation, communications, and response steps) and ensure staff know how to report incidents.",
    partial: "Your organisation should formalise and test the approach (tabletop exercises), clarify roles, and ensure procedures are followed consistently.",
  },
  "A.5.25.Q1": {
    no: "Your organisation should define event triage and classification (severity levels, criteria, escalation rules) and ensure it is applied consistently with evidence.",
    partial: "Your organisation should improve timeliness/consistency of triage and keep records of classification decisions and escalations for trend analysis.",
  },
  "A.5.26.Q1": {
    no: "Your organisation should define incident response steps (containment, eradication, recovery, communications), assign owners, and keep evidence of actions taken for each incident.",
    partial: "Your organisation should standardise playbooks for common incidents, ensure documentation/approvals are captured, and validate readiness through exercises.",
  },
  "A.5.27.Q1": {
    no: "Your organisation should perform post-incident reviews, identify root causes and improvement actions, update controls/procedures/training, and track actions to completion.",
    partial: "Your organisation should ensure reviews happen for all significant incidents, prioritise high-risk lessons, and verify corrective actions are effective.",
  },
  "A.5.28.Q1": {
    no: "Your organisation should implement a simple root cause analysis process for serious incidents (causal analysis, contributing factors, corrective actions) and document outcomes and approvals.",
    partial: "Your organisation should improve root cause analysis consistency and ensure actions are tracked to closure and validated for effectiveness.",
  },
  "A.5.28.Q2": {
    no: "Your organisation should define evidence handling procedures (collection, secure storage, integrity, retention, chain-of-custody where needed) and train responders.",
    partial: "Your organisation should strengthen evidence handling by making procedures consistent, protecting evidence from tampering, and defining retention/ownership clearly.",
  },
  "A.5.29.Q1": {
    no: "Your organisation should define secure procedures for operating during disruptions (secure comms, emergency access controls, protected backups, controlled exceptions) to maintain security under stress.",
    partial: "Your organisation should validate and improve these mechanisms through continuity/incident exercises and document/approve any emergency exceptions.",
  },
  "A.5.30.Q1": {
    no: "Your organisation should identify critical services, define recovery targets (RTO/RPO), implement recovery mechanisms (backups, redundancy where needed), and assign continuity ownership.",
    partial: "Your organisation should improve coverage for all critical services and regularly test recovery (including restores) with documented results and follow-up actions.",
  },
  "A.5.31.Q1": {
    no: "Your organisation should maintain a compliance requirements register (laws, regulations, contracts) with owners, applicability, and mapping to controls/policies and evidence.",
    partial: "Your organisation should keep the register current, review changes regularly, and ensure obligations are implemented and evidenced consistently.",
  },
  "A.5.32.Q1": {
    no: "Your organisation should define IP protection rules (licensing compliance, handling of copyrighted materials, protection of internal designs/source), assign ownership, and train staff.",
    partial: "Your organisation should improve consistency by inventorying licensed software/assets, checking compliance periodically, and strengthening controls for sensitive IP access and sharing.",
  },
  "A.5.33.Q1": {
    no: "Your organisation should define record retention and integrity requirements, control access, implement backups and recoverability, and protect records from unauthorised modification.",
    partial: "Your organisation should extend controls to all critical records, improve integrity/retention consistency, and test recovery and review retention/disposal regularly.",
  },
  "A.5.34.Q1": {
    no: "Your organisation should identify where personal data is processed, implement access controls and secure processing, define retention/deletion, manage supplier handling, and ensure breach/incident procedures cover personal data.",
    partial: "Your organisation should complete data inventories and risk checks, apply controls consistently across all systems/suppliers, and keep evidence of ongoing privacy compliance reviews.",
  },
  "A.5.35.Q1": {
    no: "Your organisation should schedule independent security reviews/audits (internal or external), document findings, and track corrective actions with owners and deadlines.",
    partial: "Your organisation should improve review scope/frequency, keep evidence, and verify that corrective actions are effective after implementation.",
  },
  "A.5.36.Q1": {
    no: "Your organisation should implement compliance monitoring (spot checks, audits, control checks), record non-compliance, and track fixes to closure with evidence.",
    partial: "Your organisation should make checks consistent, retain evidence of outcomes, and address repeat issues via root cause improvements.",
  },
  "A.5.37.Q1": {
    no: "Your organisation should document key operating procedures (access, backups, changes, incident handling, supplier onboarding), keep them accessible, version-controlled, and owned.",
    partial: "Your organisation should fill remaining gaps, keep procedures updated as systems change, and periodically verify procedures are followed and effective.",
  },

  // ── Stage 3 – People Controls (Annex A.6) ──────────────────────────────────
  "A.6.1.Q1": {
    no: "Your organisation should define pre-employment screening requirements by role (identity, employment history, education/qualifications, and other checks allowed by local law), obtain consent where required, and keep evidence that checks were completed before access is granted.",
    partial: "Your organisation should make screening consistent by applying the same role-based criteria for all relevant hires, documenting outcomes, handling exceptions with approval, and periodically reviewing the screening process for completeness.",
  },
  "A.6.2.Q1": {
    no: "Your organisation should update employment and contractor terms to clearly include information security responsibilities (confidentiality, acceptable use, protection of credentials, incident reporting, and consequences for violations).",
    partial: "Your organisation should ensure responsibilities are complete and consistently included for all staff and contractors, communicated during onboarding, and reviewed when roles or risks change.",
  },
  "A.6.3.Q1": {
    no: "Your organisation should deliver onboarding and at least annual security awareness training covering phishing, passwords, safe data handling, secure remote work, and incident reporting, and track attendance and completion.",
    partial: "Your organisation should improve training consistency by ensuring all staff are covered (including contractors), tailoring training by role, and checking understanding (short assessment) with recorded results.",
  },
  "A.6.3.Q2": {
    no: "Your organisation should define triggers to update training (policy changes, new threats, incidents, new technology) and refresh training content accordingly, with version control and review dates.",
    partial: "Your organisation should make updates timely and repeatable by assigning an owner, keeping an update schedule, and ensuring staff complete the updated training when major changes occur.",
  },
  "A.6.4.Q1": {
    no: "Your organisation should define a disciplinary process for information security violations (reporting, investigation, decision-making, proportional actions, and documentation) aligned with HR and legal requirements.",
    partial: "Your organisation should ensure the process is applied consistently, decisions are documented, and repeated violations are analysed to improve underlying controls and training.",
  },
  "A.6.4.Q2": {
    no: "Your organisation should document the disciplinary process and communicate it to all staff (including new joiners), with acknowledgement where appropriate.",
    partial: "Your organisation should improve communication by making it easy to find, reinforcing it during training, and confirming staff understand escalation and consequences.",
  },
  "A.6.5.Q1": {
    no: "Your organisation should implement a joiner/mover/leaver process that triggers immediate access changes and asset return (accounts, devices, badges, keys), with clear owners and deadlines.",
    partial: "Your organisation should make the process consistent across all systems by integrating it with HR workflows, tracking completion for every case, and periodically checking for orphaned accounts or missed assets.",
  },
  "A.6.6.Q1": {
    no: "Your organisation should require confidentiality agreements for employees and relevant third parties before they access sensitive information, and store signed evidence securely.",
    partial: "Your organisation should ensure coverage is complete (all relevant roles and suppliers), terms match current data handling needs, and exceptions are formally approved.",
  },
  "A.6.6.Q2": {
    no: "Your organisation should set a review cycle (e.g., annually and when laws/contracts change) to update confidentiality terms and templates, with legal review where needed.",
    partial: "Your organisation should make reviews consistent by tracking agreement versions, refreshing older agreements when material changes occur, and confirming renewed acceptance where required.",
  },
  "A.6.7.Q1": {
    no: "Your organisation should define and implement remote working controls, such as secure device configuration, encryption, secure access (VPN where appropriate), approved collaboration tools, and guidance for secure home network use.",
    partial: "Your organisation should strengthen remote working security by applying controls consistently to all remote users, improving monitoring and patching, and reinforcing expectations through training and periodic checks.",
  },
  "A.6.8.Q1": {
    no: "Your organisation should provide simple reporting channels (email alias, ticket form, hotline/chat) with clear instructions, triage ownership, and response targets, and ensure reports are logged.",
    partial: "Your organisation should improve reporting by ensuring channels are always accessible, triage is timely, and outcomes are documented and tracked to closure.",
  },
  "A.6.8.Q2": {
    no: "Your organisation should train staff on what to report (phishing, lost devices, suspicious access, data leaks) and how to report quickly, as part of onboarding and regular refresh.",
    partial: "Your organisation should improve effectiveness by reinforcing training periodically, using short simulations or examples, and tracking completion and understanding.",
  },

  // ── Stage 4 – Physical Controls (Annex A.7) ────────────────────────────────
  "A.7.1.Q1": {
    no: "Your organisation should identify areas containing sensitive information/systems and define physical security boundaries (rooms, cabinets, server areas), documenting what is 'restricted' and what protections apply.",
    partial: "Your organisation should complete boundary definitions for all relevant areas, keep them current, and ensure protections match risk (especially for critical systems and sensitive data).",
  },
  "A.7.1.Q2": {
    no: "Your organisation should restrict access to secure areas (locks, access cards/keys, visitor controls) and implement monitoring appropriate to risk (e.g., logs or alarms).",
    partial: "Your organisation should strengthen control by reviewing who has access regularly, removing unnecessary access, and improving monitoring and response for access violations.",
  },
  "A.7.2.Q1": {
    no: "Your organisation should implement entry controls for premises (controlled doors, reception process, and visitor management) to prevent unauthorised entry.",
    partial: "Your organisation should improve consistency by ensuring controls cover all entrances, after-hours access is controlled, and exceptions are approved and recorded.",
  },
  "A.7.2.Q2": {
    no: "Your organisation should record visitors (name, organisation, host, time in/out, purpose) and require escorting where appropriate, retaining records for an agreed period.",
    partial: "Your organisation should ensure visitor logging is complete and consistent, and periodically review records for anomalies or repeated access issues.",
  },
  "A.7.3.Q1": {
    no: "Your organisation should implement basic facility protections (locks, controlled access to sensitive rooms, secure storage for sensitive materials) based on risk.",
    partial: "Your organisation should close gaps by expanding protections to all sensitive rooms and ensuring designs are consistent across sites.",
  },
  "A.7.3.Q2": {
    no: "Your organisation should deploy suitable locks and barriers and, where necessary, monitoring systems to protect sensitive areas and equipment from unauthorised access.",
    partial: "Your organisation should improve by standardising controls, maintaining them, and ensuring monitoring is actively used and responded to.",
  },
  "A.7.4.Q1": {
    no: "Your organisation should implement physical monitoring appropriate to risk (e.g., CCTV, intrusion alarms, or access logs) and define who reviews alerts and how response is handled.",
    partial: "Your organisation should ensure monitoring is consistently operational, retained for an appropriate period, and reviewed with documented follow-up actions.",
  },
  "A.7.5.Q1": {
    no: "Your organisation should assess physical and environmental risks and implement protections such as fire detection/suppression, water leakage protection, temperature/humidity control, surge protection, and safe equipment placement.",
    partial: "Your organisation should improve by ensuring protections cover all critical areas, maintenance checks are performed, and gaps found during incidents/tests are tracked to completion.",
  },
  "A.7.6.Q1": {
    no: "Your organisation should restrict secure areas to authorised personnel only, enforce visitor escorting, and ensure access permissions are approved and recorded.",
    partial: "Your organisation should strengthen by reviewing access lists regularly, tightening controls for high-risk areas, and recording and investigating access violations.",
  },
  "A.7.7.Q1": {
    no: "Your organisation should implement clear desk and screen requirements, including automatic screen locking and guidance for handling paper records and removable media.",
    partial: "Your organisation should improve consistency through training, periodic checks, and enforcement for repeated non-compliance.",
  },
  "A.7.7.Q2": {
    no: "Your organisation should document clear screen requirements (lock when unattended, no shared unlocked workstations, secure viewing in public spaces) and communicate them to staff.",
    partial: "Your organisation should update and reinforce the policy to match real working patterns (remote/hybrid) and ensure technical settings support it.",
  },
  "A.7.8.Q1": {
    no: "Your organisation should site equipment securely (restricted areas, locked cabinets where needed), protect it from environmental damage, and prevent unauthorised handling.",
    partial: "Your organisation should strengthen by improving consistency across all locations and ensuring protection is appropriate for equipment containing sensitive information.",
  },
  "A.7.9.Q1": {
    no: "Your organisation should define controls for off-site assets (device encryption, secure transport/storage, reporting loss quickly, and restricting use in public places) and ensure staff follow them.",
    partial: "Your organisation should strengthen by applying controls to all relevant devices, ensuring compliance checks, and improving incident handling for lost/stolen devices.",
  },
  "A.7.9.Q2": {
    no: "Your organisation should train staff on protecting devices and information during remote work (secure storage, safe printing, avoiding shared devices, and reporting loss).",
    partial: "Your organisation should reinforce training periodically, include practical scenarios, and track completion and understanding.",
  },
  "A.7.10.Q1": {
    no: "Your organisation should define procedures for storage media handling (use, labelling, secure storage, transport, reuse, and disposal) and ensure media containing sensitive data is protected and tracked.",
    partial: "Your organisation should improve consistency by tracking high-risk media, standardising disposal methods, and documenting evidence of secure disposal or wiping.",
  },
  "A.7.11.Q1": {
    no: "Your organisation should implement protections so utilities do not disrupt critical systems, such as backup power, surge protection, and safe shutdown procedures appropriate to risk.",
    partial: "Your organisation should strengthen by ensuring protections cover all critical equipment and are maintained and tested periodically with recorded results.",
  },
  "A.7.12.Q1": {
    no: "Your organisation should protect cabling (secure routing, protected conduits, restricted cable rooms) to reduce risks of tampering, interception, and accidental damage.",
    partial: "Your organisation should improve by identifying high-risk cabling routes, strengthening physical protection, and controlling access to cabling infrastructure.",
  },
  "A.7.13.Q1": {
    no: "Your organisation should implement planned maintenance for critical equipment and systems (including security updates where applicable), and keep records of maintenance activities.",
    partial: "Your organisation should make maintenance consistent by covering all critical assets, keeping schedules and evidence, and tracking maintenance issues to resolution.",
  },
  "A.7.14.Q1": {
    no: "Your organisation should implement secure data removal before reuse/disposal (secure wiping or physical destruction appropriate to risk) and retain evidence of completion.",
    partial: "Your organisation should strengthen by applying the process consistently to all assets, using approved methods, and keeping auditable records of disposal and data removal.",
  },

  // ── Stage 5 – Technological Controls (Annex A.8) ───────────────────────────
  "A.8.1.Q1": {
    no: "Your organisation should implement baseline endpoint protections (device encryption, screen lock, anti-malware, timely patching, and device management) for all devices that access organisational information.",
    partial: "Your organisation should make protections consistent across all devices, verify compliance (reporting), and improve controls for high-risk users and sensitive data access.",
  },
  "A.8.2.Q1": {
    no: "Your organisation should tightly control privileged access using approvals, least privilege, separate admin accounts, and strong authentication such as MFA, with logging of privileged actions.",
    partial: "Your organisation should strengthen by reviewing privileged accounts regularly, removing unnecessary privileges, and improving monitoring and approval evidence.",
  },
  "A.8.3.Q1": {
    no: "Your organisation should implement role-based access and need-to-know rules for sensitive information, including approvals and periodic access reviews.",
    partial: "Your organisation should improve consistency across systems and ensure access reviews result in timely removal of unnecessary access.",
  },
  "A.8.4.Q1": {
    no: "Your organisation should restrict source code and development tool access to authorised roles only, use strong authentication, and log access and changes.",
    partial: "Your organisation should improve by enforcing least privilege, reviewing access regularly, and ensuring changes are traceable through change history and approvals.",
  },
  "A.8.5.Q1": {
    no: "Your organisation should implement strong authentication for critical systems, including multi-factor authentication (MFA) and strong password standards, and secure account recovery procedures.",
    partial: "Your organisation should expand MFA coverage to all critical services and privileged accounts, and ensure authentication standards are consistently enforced.",
  },
  "A.8.6.Q1": {
    no: "Your organisation should monitor system and service capacity (performance, storage, availability) and plan for growth so critical services remain reliable, with thresholds and owners for action.",
    partial: "Your organisation should improve by making monitoring consistent across critical services, reviewing trends regularly, and documenting capacity actions and outcomes.",
  },
  "A.8.7.Q1": {
    no: "Your organisation should implement anti-malware protections, secure configuration, timely patching, and user awareness to reduce malicious software infections.",
    partial: "Your organisation should strengthen by ensuring protections are consistently deployed, monitored, and updated, and by reviewing incidents to improve controls.",
  },
  "A.8.8.Q1": {
    no: "Your organisation should implement a vulnerability management process: asset scope, vulnerability scanning, prioritisation by risk, patching/remediation timelines, and verification of fixes; use VAPT where appropriate.",
    partial: "Your organisation should strengthen by applying consistent timelines, tracking remediation to closure, and reporting overdue high-risk vulnerabilities to management.",
  },
  "A.8.9.Q1": {
    no: "Your organisation should define secure configuration baselines, control changes through approvals, and document and review configuration changes for critical systems.",
    partial: "Your organisation should improve by expanding baseline coverage, detecting unauthorised changes, and performing periodic configuration reviews.",
  },
  "A.8.10.Q1": {
    no: "Your organisation should define retention and deletion rules and implement secure deletion methods for systems and storage, ensuring data is removed when no longer required.",
    partial: "Your organisation should improve by applying deletion rules consistently across systems and keeping evidence that deletion occurs as required.",
  },
  "A.8.11.Q1": {
    no: "Your organisation should implement data masking for use cases such as reports, support tools, and testing, so only the minimum necessary data is visible.",
    partial: "Your organisation should expand masking coverage to all relevant systems and ensure masking rules are consistently applied and reviewed.",
  },
  "A.8.11.Q2": {
    no: "Your organisation should protect sensitive data with encryption in storage and in transfer, even when masked, and manage encryption keys securely with restricted access.",
    partial: "Your organisation should strengthen by standardising encryption requirements, improving key management controls, and verifying encryption is consistently implemented.",
  },
  "A.8.12.Q1": {
    no: "Your organisation should implement controls to reduce leakage risk, such as labelling/classification, restrictions on external sharing, monitoring, and DLP rules where appropriate.",
    partial: "Your organisation should improve by tuning controls to high-risk channels, reviewing alerts/incidents regularly, and closing gaps found in repeated leakage events.",
  },
  "A.8.13.Q1": {
    no: "Your organisation should implement backups for critical systems and data, define backup scope and frequency based on business needs, protect backups from unauthorised access and tampering, and ensure backups support recovery objectives.",
    partial: "Your organisation should strengthen backups by ensuring coverage is complete, performing regular restore tests with documented results, and addressing gaps such as missing systems or inadequate backup protection.",
  },
  "A.8.13.Q2": {
    no: "Your organisation should define and test restore procedures, confirm backups support recovery time (RTO) and recovery point (RPO) objectives, and keep documented results of restore tests.",
    partial: "Your organisation should improve restore testing frequency, ensure results are documented and acted on, and verify all critical backups are restorable and meet defined objectives.",
  },
  "A.8.14.Q1": {
    no: "Your organisation should implement redundancy for critical components and services (e.g., failover capabilities and resilient architecture) so availability can be maintained if primary systems fail.",
    partial: "Your organisation should strengthen redundancy by validating coverage for critical services and dependencies, testing failover where feasible, and documenting the design and responsibilities for maintaining resilience.",
  },
  "A.8.15.Q1": {
    no: "Your organisation should enable logging for key systems and security-relevant activities (e.g., authentication, privileged actions, and access to sensitive data), define what must be logged, and ensure logs support monitoring and incident investigation.",
    partial: "Your organisation should improve logging by protecting logs from tampering, ensuring accurate timestamps, defining retention, and ensuring logs are reviewed appropriately with clear ownership and escalation.",
  },
  "A.8.16.Q1": {
    no: "Your organisation should implement monitoring for systems and networks to detect suspicious or abnormal behaviour, define alert thresholds and response steps, and ensure monitoring outputs are reviewed and acted on in a timely manner.",
    partial: "Your organisation should strengthen monitoring by improving coverage and alert quality, ensuring review happens consistently, and linking detections to incident response workflows and corrective actions.",
  },
  "A.8.16.Q2": {
    no: "Your organisation should define who reviews monitoring outputs, how to respond to alerts, and what evidence to keep. Assign an owner and define escalation steps.",
    partial: "Your organisation should improve response consistency by standardising triage steps, ensuring alerts are actioned in a timely way, and reviewing unactioned alerts periodically.",
  },
  "A.8.17.Q1": {
    no: "Your organisation should synchronise clocks across systems using a consistent time source (e.g., NTP) so logs can be correlated accurately during monitoring and incident investigations.",
    partial: "Your organisation should improve clock synchronisation by ensuring all relevant systems are covered, monitoring time drift, and validating time synchronisation configuration after significant changes.",
  },
  "A.8.18.Q1": {
    no: "Your organisation should restrict and control the use of powerful utility programs and administrative tools that can bypass controls, including approvals for use, least privilege, logging of usage, and separation of duties where feasible.",
    partial: "Your organisation should strengthen oversight by tightening access to these tools, improving monitoring and review of tool usage, and removing unnecessary tools or access rights from systems where they are not needed.",
  },
  "A.8.19.Q1": {
    no: "Your organisation should control software installation on operational systems by defining who can install software, requiring approval and security review for new software, maintaining an inventory of installed software, and ensuring installations are logged and tracked.",
    partial: "Your organisation should strengthen installation controls by applying the approval process consistently, covering third-party and open-source components, and reviewing installed software periodically to detect unauthorised or risky installations.",
  },
  "A.8.20.Q1": {
    no: "Your organisation should confirm whether it manages or uses a network. If yes, implement network security controls such as firewalls, secure configuration, access controls, and secure remote access (VPN) to protect systems and information from unauthorised access.",
    partial: "Your organisation should strengthen network security by improving segmentation, restricting inbound and outbound traffic, monitoring network activity, and reviewing firewall and network rules periodically.",
  },
  "A.8.21.Q1": {
    no: "Your organisation should secure network services by hardening configurations, restricting administrative access, monitoring service activity, and ensuring service providers and internal service owners meet defined security requirements.",
    partial: "Your organisation should improve network service security by reviewing configurations and provider controls regularly, strengthening monitoring, and ensuring changes to network services follow change management.",
  },
  "A.8.22.Q1": {
    no: "Your organisation should implement network segmentation to separate systems with different security requirements (e.g., user networks, server networks, and administrative networks) and limit lateral movement in case of compromise.",
    partial: "Your organisation should strengthen segmentation by validating that segmentation controls are enforced, addressing gaps, and reviewing exceptions regularly with documented approvals.",
  },
  "A.8.23.Q1": {
    no: "Your organisation should manage access to external websites by implementing filtering and security controls that reduce exposure to malicious and inappropriate content, and by defining acceptable browsing rules aligned to policy.",
    partial: "Your organisation should improve web access controls by tuning filtering rules, monitoring trends and bypass attempts, and updating controls based on emerging threats and observed incidents.",
  },
  "A.8.24.Q1": {
    no: "Your organisation should implement encryption for sensitive information in storage and in transit where appropriate, define approved cryptographic standards, and manage encryption keys securely with clear ownership and access controls.",
    partial: "Your organisation should strengthen encryption by ensuring consistent coverage across systems and data flows, improving key management practices, and periodically reviewing cryptographic configurations and certificates.",
  },
  "SDLC_GATE_Q1": {
    no: "Your organisation should confirm whether it develops or significantly customises software. If yes, treat secure development controls as in scope and implement the relevant SDLC controls (A.8.25–A.8.29, A.8.31, A.8.33). If no, document the rationale and review it when the delivery model changes.",
    partial: "Your organisation should clarify the scope of software development/customisation (internal and outsourced), and ensure secure development controls are applied to all in-scope software changes consistently.",
  },
  "A.8.25.Q1": {
    no: "Your organisation should integrate security throughout the software development life cycle by defining secure development practices, roles and responsibilities, required security activities (e.g., design review and testing), and evidence requirements before release.",
    partial: "Your organisation should strengthen secure development by ensuring security activities are consistently applied across teams and projects, tracked to completion, and reviewed for effectiveness with evidence.",
  },
  "A.8.26.Q1": {
    no: "Your organisation should define application and system security requirements before development or acquisition (e.g., authentication, authorisation, logging, encryption, privacy, and resilience requirements) and ensure requirements are reviewed and approved by appropriate stakeholders.",
    partial: "Your organisation should improve requirements management by ensuring security requirements are consistently captured, updated when systems change, and verified during design, build, and testing with documented outcomes.",
  },
  "A.8.27.Q1": {
    no: "Your organisation should apply secure architecture and design principles when building or changing systems, including threat-driven design considerations, separation of duties where needed, secure defaults, and protection of sensitive data flows.",
    partial: "Your organisation should strengthen secure design by making reviews consistent, documenting decisions and exceptions, and tracking identified weaknesses and remediation actions to closure.",
  },
  "A.8.28.Q1": {
    no: "Your organisation should implement secure coding practices and standards, ensure developers are trained on secure coding, and require peer review of changes to reduce vulnerabilities introduced during development.",
    partial: "Your organisation should strengthen secure coding by improving consistency across teams, using checklists or standards for reviews, and tracking remediation of common coding weaknesses identified during reviews and testing.",
  },
  "A.8.29.Q1": {
    no: "Your organisation should perform security testing before deploying systems to production, ensuring testing is appropriate to risk and includes verification of key security requirements, and that findings are prioritised and resolved before release.",
    partial: "Your organisation should strengthen security testing by applying it consistently, protecting test environments and test data, ensuring remediation is tracked to closure, and keeping evidence of test scope, results, and approvals.",
  },
  "A.8.30.Q1": {
    no: "Your organisation should ensure outsourced development is governed by defined security requirements, including secure development practices, access controls, incident notification, testing expectations, and rights to review assurance evidence.",
    partial: "Your organisation should improve oversight by monitoring delivery against security requirements, reviewing evidence of secure development and testing, and tracking remediation of issues identified with suppliers to completion.",
  },
  "A.8.31.Q1": {
    no: "Your organisation should separate development, test, and production environments to reduce risk of unauthorised changes and data exposure, including separate access controls, restricted data movement, and clear rules for promoting changes to production.",
    partial: "Your organisation should strengthen separation by tightening access boundaries, preventing production data from being used in lower environments unless protected appropriately, and reviewing environment access and data flows periodically.",
  },
  "A.8.32.Q1": {
    no: "Your organisation should implement change management for systems and services, including risk assessment, review and approval, testing, rollback planning, and recording of changes with clear ownership and evidence of implementation.",
    partial: "Your organisation should strengthen change management by applying the process consistently, improving the quality of change records (including risk and testing evidence), and reviewing changes periodically to identify repeat issues and control gaps.",
  },
  "A.8.33.Q1": {
    no: "Your organisation should protect test data from unauthorised access and exposure by using synthetic or anonymised data where feasible, restricting access to test environments, and preventing sensitive production data from being copied into test without appropriate protections.",
    partial: "Your organisation should strengthen test data protection by standardising rules for data use, auditing access to test environments, and verifying that any sensitive data used for testing is protected and handled according to retention and disposal requirements.",
  },
  "A.8.34.Q1": {
    no: "Your organisation should perform technical assurance activities (e.g., vulnerability assessment and penetration testing) in a controlled manner with defined scope, approvals, and safeguards to avoid disrupting operations and introducing new risks.",
    partial: "Your organisation should strengthen technical assurance by planning and coordinating testing, defining rules of engagement, tracking findings and remediation to closure, and retaining evidence of scope, results, and approvals.",
  },
};

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Converts any question ID format used in the data files into the canonical
 * lookup key used above.
 *
 * Supported input formats (examples):
 *   Org  (stage 2): A5.1.Q1   A5.19.GW1
 *   People (stage 3): A.6.1-Q1
 *   Physical (stage 4): A7.1_Q1   A7.3_Q2
 *   Tech  (stage 5): A8.1_Q1   A8.20_Q1   SDLC_GATE_Q1
 *   Stage 1: 4.2  10.1
 */
function normalizeId(questionId) {
  const id = String(questionId || "").trim();
  if (!id) return id;

  // Stage 1 – plain clause ids e.g. "4.2", "10.1"
  if (/^\d+\.\d+$/.test(id)) return id;

  // Pass-through for SDLC gate and any already-normalised key
  if (id === "SDLC_GATE_Q1") return id;

  // Gateway IDs: A5.19.GW1 → A.5.19.Q1
  const gw = /^A(\d+)\.(\d+)\.GW\d+$/i.exec(id);
  if (gw) return `A.${gw[1]}.${gw[2]}.Q1`;

  // Org format:  A5.1.Q1, A5.19.Q2 → A.5.1.Q1
  const m1 = /^A(\d+)\.(\d+)\.Q(\d+)$/i.exec(id);
  if (m1) return `A.${m1[1]}.${m1[2]}.Q${m1[3]}`;

  // People format: A.6.1-Q1 → A.6.1.Q1
  const m2 = /^A\.(\d+)\.(\d+)-Q(\d+)$/i.exec(id);
  if (m2) return `A.${m2[1]}.${m2[2]}.Q${m2[3]}`;

  // Physical/tech underscore format: A7.1_Q1, A8.20_Q1 → A.7.1.Q1
  const m3 = /^A(\d+)\.(\d+)_Q(\d+)$/i.exec(id);
  if (m3) return `A.${m3[1]}.${m3[2]}.Q${m3[3]}`;

  // Already dotted format (e.g. A.8.1.Q1 from some paths)
  if (/^A\.\d+\.\d+\.Q\d+$/i.test(id)) return id;

  return id;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the recommendation text for a given question ID and answer, or null.
 * @param {string} questionId  - raw question id from data files (any format)
 * @param {"no"|"partial"} answer
 * @returns {string|null}
 */
export function getRecommendation(questionId, answer) {
  const ans = String(answer || "").toLowerCase().trim();
  if (ans !== "no" && ans !== "partial") return null;

  const key = normalizeId(questionId);
  const entry = R[key];
  if (entry) return ans === "no" ? entry.no : entry.partial;

  // Control-level fallback: strip question suffix
  const controlKey = key.replace(/\.Q\d+$/i, "");
  if (controlKey !== key) {
    const controlEntry = R[controlKey];
    if (controlEntry) return ans === "no" ? controlEntry.no : controlEntry.partial;
  }

  return null;
}
