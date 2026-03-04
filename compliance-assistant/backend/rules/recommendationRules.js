/**
 * Recommendation rule book.
 * Maps (controlId, complianceState) to a recommendation string.
 * Used by backend/utils/recommendations.js.
 */

export function getRecommendationForControl(
  controlId,
  complianceState,
  orgName = "The organization"
) {
  /**
   * Returns recommendation text for one control/question id and compliance state.
   * Returns null when no recommendation is required or no rule applies.
   */
  if (complianceState === "FULLY_COMPLIANT" || complianceState === "NOT_APPLICABLE") {
    return null;
  }

  const interpolateOrgName = (text) => {
    if (text == null) return null;
    // Support templates using the literal placeholder "${orgName}".
    // (Other rules already interpolate orgName via template literals.)
    return String(text).split("${orgName}").join(orgName);
  };

  const aliasMandatoryQuestionId = (rawId) => {
    // Some builds store Stage 1 mandatory question IDs as "6.1.Q1" / "6.1.Q2"
    // (two questions under one clause), while the rulebook uses ISO clause keys
    // like "6.1" and "6.2".
    const id = String(rawId || "").trim();

    // Normalize suffix formats: ".Q1", "_Q1", "-Q1".
    const m = /^(\d+\.\d+)[._-]Q(\d+)$/i.exec(id);
    if (!m) return id;
    const base = m[1];
    const qn = Number(m[2]);
    if (!Number.isFinite(qn) || qn < 1) return id;

    // Legacy Stage 1 mapping:
    // - Some older UIs asked multiple questions under a single clause base like "4.1",
    //   saving answers as 4.1.Q1, 4.1.Q2, 4.1.Q3.
    // - Our rulebook uses the ISO clause keys: 4.1, 4.2, 4.3, ...
    // So we map (base, Qn) -> clause key.
    const map = {
      // Clause 4 legacy variants:
      // Some builds stored Clause 4 Q1/Q2 under a shared base "4.1".
      // In the current questionnaire, stakeholder expectations map to 4.2 and ISMS scope maps to 4.3.
      // Map legacy Q1/Q2 accordingly.
      "4.1": { 1: "4.2", 2: "4.3", 3: "4.1" },
      "5.1": { 1: "5.1", 2: "5.2" },
      "6.1": { 1: "6.1", 2: "6.2" },
      "7.1": { 1: "7.1", 2: "7.2", 3: "7.3" },
      "8.1": { 1: "8.1", 2: "8.2" },
      "9.1": { 1: "9.1", 2: "9.2" },
      "10.1": { 1: "10.1", 2: "10.2" },
    };

    return map?.[base]?.[qn] || base;
  };

  const canonicalizeRuleKey = (rawId) => {
    // Normalizes common control/question id formats into a rule lookup key.
    // Examples:
    // - A5.1.Q1   -> A.5.1.Q1
    // - A7.1_Q2   -> A.7.1.Q2
    // - A8.2_Q1   -> A.8.2.Q1
    // - A.6.4-Q2  -> A.6.4.Q2
    // - A.6.1-Q1  -> A.6.1.Q1
    // - 6.1.Q2    -> (left as-is; stage1 aliasing handles it)
    const id = String(rawId || "").trim();
    if (!id) return id;

    // Normalize -Q / _Q to .Q for dotted Annex ids.
    const dottedAnnexQ = /^A\.(\d+)\.(\d+)(?:\.(\d+))?[-_.]Q(\d+)$/i.exec(id);
    if (dottedAnnexQ) {
      const a = Number(dottedAnnexQ[1]);
      const b = Number(dottedAnnexQ[2]);
      const c = dottedAnnexQ[3] != null ? Number(dottedAnnexQ[3]) : null;
      const q = Number(dottedAnnexQ[4]);
      const base = c != null ? `A.${a}.${b}.${c}` : `A.${a}.${b}`;
      return `${base}.Q${q}`;
    }

    // Normalize non-dotted Annex ids used by Stage 2/4/5 datasets.
    const flat2 = /^A(\d+)\.(\d+)\.[Qq](\d+)$/i.exec(id);
    if (flat2) return `A.${Number(flat2[1])}.${Number(flat2[2])}.Q${Number(flat2[3])}`;

    // Normalize gateway ids (e.g. A5.19.GW1) to map to the corresponding question key.
    // Gateways are usually the same text as Q1 for that control.
    const flat2Gw = /^A(\d+)\.(\d+)\.GW\d+$/i.exec(id);
    if (flat2Gw) return `A.${Number(flat2Gw[1])}.${Number(flat2Gw[2])}.Q1`;

    const flat3 = /^A(\d+)\.(\d+)\.(\d+)\.[Qq](\d+)$/i.exec(id);
    if (flat3) {
      return `A.${Number(flat3[1])}.${Number(flat3[2])}.${Number(flat3[3])}.Q${Number(flat3[4])}`;
    }

    const flat3Gw = /^A(\d+)\.(\d+)\.(\d+)\.GW\d+$/i.exec(id);
    if (flat3Gw) {
      return `A.${Number(flat3Gw[1])}.${Number(flat3Gw[2])}.${Number(flat3Gw[3])}.Q1`;
    }

    const underscore2 = /^A(\d+)\.(\d+)_Q(\d+)$/i.exec(id);
    if (underscore2) return `A.${Number(underscore2[1])}.${Number(underscore2[2])}.Q${Number(underscore2[3])}`;

    const underscore2Gw = /^A(\d+)\.(\d+)_GW\d+$/i.exec(id);
    if (underscore2Gw) return `A.${Number(underscore2Gw[1])}.${Number(underscore2Gw[2])}.Q1`;

    const underscore3 = /^A(\d+)\.(\d+)\.(\d+)_Q(\d+)$/i.exec(id);
    if (underscore3) {
      return `A.${Number(underscore3[1])}.${Number(underscore3[2])}.${Number(underscore3[3])}.Q${Number(underscore3[4])}`;
    }

    const underscore3Gw = /^A(\d+)\.(\d+)\.(\d+)_GW\d+$/i.exec(id);
    if (underscore3Gw) {
      return `A.${Number(underscore3Gw[1])}.${Number(underscore3Gw[2])}.${Number(underscore3Gw[3])}.Q1`;
    }

    return id;
  };

  // rules[controlId][complianceState] -> recommendation text
  const rules = {
    // Stage 1 (Clauses 4–10): per-question and per-clause recommendations.
    // Only NOT_COMPLIANT and PARTIALLY_COMPLIANT are defined here.
    // Clause 4: Context of the Organization
    "4.1": {
      NOT_COMPLIANT:
        `${orgName} should document its business purpose and strategic direction, and identify the key internal and external issues that affect information security (e.g., regulatory, market, technology, organizational changes). Review and update this when significant changes occur.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete its documentation of business context by capturing missing internal/external issues, clarifying impacts on information security, assigning ownership, and reviewing it regularly (and when things change).`,
    },
    "4.2": {
      NOT_COMPLIANT:
        `${orgName} should list all key stakeholders (customers, regulators, partners, employees) and write down what each expects for information security (laws, contracts, privacy, service requirements). Keep this list updated.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete the stakeholder list and fill missing expectations. Make sure the requirements are clear, owned by someone, and reviewed regularly (and when things change).`,
    },
    "4.3": {
      NOT_COMPLIANT:
        `${orgName} should document what is included in the ISMS (sites, systems, data, and processes) and what is excluded (with a clear reason). Share this scope with the people responsible for security.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make the scope clearer and more complete (what’s in/out, key systems and data, third parties). Keep it controlled and updated when the business or IT changes.`,
    },

    // Clause 5: Leadership
    "5.1": {
      NOT_COMPLIANT:
        `${orgName} should have top management actively support security by approving the security direction, assigning clear responsibility, providing budget/time/tools, and reviewing security performance regularly.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make management support more consistent by setting a regular review (e.g., monthly/quarterly), recording decisions/actions, and following up until actions are completed.`,
    },
    "5.2": {
      NOT_COMPLIANT:
        `${orgName} should create a simple Information Security Policy, get it approved by management, and share it with all employees (including new joiners). Keep one owner and a review date.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should update the policy to reflect how the organization actually operates, make sure employees receive it and acknowledge it, and review it at least yearly or after major changes.`,
    },
    "5.3": {
      NOT_COMPLIANT:
        `${orgName} should clearly assign and document information security roles and responsibilities (e.g., who owns security, who approves access, who handles incidents) and communicate them to the relevant people.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should remove role confusion by documenting ownership for each key security task, defining escalation paths, and ensuring people understand their responsibilities.`,
    },

    // Clause 6: Planning (Risk Assessment & Treatment)
    "6.1": {
      NOT_COMPLIANT:
        `${orgName} should create a repeatable risk assessment method: list key assets, identify threats and weaknesses, and rate impact and likelihood. Record results in a risk register.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make risk assessments consistent by using one method across all areas, keeping records, and reassessing when major changes happen (new systems, suppliers, incidents).`,
    },
    "6.2": {
      NOT_COMPLIANT:
        `${orgName} should document how each major risk will be handled (accept/mitigate/transfer/avoid) and list the exact controls or actions to implement, with an owner and deadline.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve risk treatment by ensuring every risk has a clear decision, mapped actions/controls, tracked progress, and evidence when actions are completed (including approvals for accepted risks).`,
    },

    // Legacy/extended Clause 6 keys (kept for compatibility)
    "6.1.1": {
      NOT_COMPLIANT:
        `${orgName} should identify information security risks and opportunities and create a simple plan to address them (actions, owner, due date). Track progress to completion.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make risk/opportunity planning more consistent by documenting actions, assigning owners and deadlines, and regularly reviewing progress and outcomes.`,
    },
    "6.1.2": {
      NOT_COMPLIANT:
        `${orgName} should define a repeatable risk assessment method (assets, threats, vulnerabilities, likelihood and impact) and use it consistently. Record results in a risk register so risks can be compared and prioritized over time.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize risk assessments by using one agreed method and criteria across the organization, keeping records, and reassessing when major changes occur.`,
    },
    "6.1.3": {
      NOT_COMPLIANT:
        `${orgName} should document how each major risk will be handled (accept/mitigate/transfer/avoid) and list the exact controls or actions to implement, with an owner and deadline.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve risk treatment by ensuring every risk has a clear decision, mapped actions/controls, tracked progress, and evidence when actions are completed (including approvals for accepted risks).`,
    },

    // Clause 7: Support (Resources, Competence, Awareness)
    "7.1": {
      NOT_COMPLIANT:
        `${orgName} should run basic security training for all staff during onboarding and at least yearly (phishing, passwords, data handling, incident reporting). Track attendance.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve training by covering all staff consistently, refreshing it regularly, and checking understanding (short quiz or phishing simulation). Keep records.`,
    },
    "7.2": {
      NOT_COMPLIANT:
        `${orgName} should clearly define who owns security, who manages access, and who handles incidents. Document these responsibilities and tell the relevant people.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should remove role confusion by documenting ownership for each key security task, setting escalation paths, and ensuring staff understand their responsibilities.`,
    },
    "7.3": {
      NOT_COMPLIANT:
        `${orgName} should maintain a competency/skills record (e.g., a competency matrix) for information security roles, define required competencies, assess current gaps, and provide training or support. Keep evidence of competence (training records, experience).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve competence management by completing the competency record for all relevant roles, keeping it up to date, addressing identified gaps with training, and periodically reviewing competence as systems and threats change.`,
    },
    "7.4": {
      NOT_COMPLIANT:
        `${orgName} should define what security-related communications are needed, who they are for, when they happen, and how they are delivered (internal and external where relevant). Assign owners for these communications.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should formalize communications by setting a clear schedule/triggers (e.g., incidents, policy changes), assigning responsibility, and keeping evidence that key communications happen.`,
    },
    "7.5": {
      NOT_COMPLIANT:
        `${orgName} should implement document control for ISMS documentation (version control, approvals, access control, secure storage, and regular review) so documents stay accurate and protected.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen document control by ensuring documents are reviewed on schedule, outdated versions are removed or marked, access is controlled, and changes are tracked consistently.`,
    },

    // Clause 8: Operation (Implementing and Running Controls)
    "8.1": {
      NOT_COMPLIANT:
        `${orgName} should document and implement basic procedures for access control, backups/restore, incident handling, and change management (who does what, when, and how).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete missing procedures and standardize how they are followed across teams and systems, not only in some areas.`,
    },
    "8.2": {
      NOT_COMPLIANT:
        `${orgName} should ensure day-to-day use of procedures by keeping evidence such as tickets, approvals, backup logs, restore test results, incident records, and change records.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by collecting evidence every time, reviewing it regularly, and fixing repeated gaps (e.g., missing approvals, untested restores).`,
    },
    "8.3": {
      NOT_COMPLIANT:
        `${orgName} should implement risk treatment plans and keep records showing what was done (actions completed, evidence, approvals, and any accepted residual risks).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve treatment execution by tracking actions to closure, keeping consistent evidence, and periodically confirming that implemented treatments remain effective.`,
    },

    // Clause 9: Performance Evaluation
    "9.1": {
      NOT_COMPLIANT:
        `${orgName} should run internal reviews/audits at least annually, document findings, and track corrective actions until completed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make reviews more effective by using a plan, covering all key areas, documenting evidence, and verifying corrective actions are completed and working.`,
    },
    "9.2": {
      NOT_COMPLIANT:
        `${orgName} should hold regular management reviews of security performance (incidents, audits, key metrics) and decide actions with owners and deadlines.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve management review by recording decisions, tracking actions to completion, and reviewing trends (repeat incidents/issues) to prevent recurrence.`,
    },
    "9.3": {
      NOT_COMPLIANT:
        `${orgName} should hold regular management reviews of the ISMS (incidents, audits, metrics, risks, resource needs) and record decisions and actions with owners and deadlines.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve management review by using a consistent agenda/inputs, recording actions, and tracking them to completion with follow-up on outcomes.`,
    },

    // Clause 10: Improvement
    "10.1": {
      NOT_COMPLIANT:
        `${orgName} should log incidents and audit findings, assign corrective actions (owner + due date), and track them until they are completed and checked for effectiveness.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve corrective actions by doing basic root-cause checks, prioritizing high-risk issues, and confirming the fix actually prevents the issue from happening again.`,
    },
    "10.2": {
      NOT_COMPLIANT:
        `${orgName} should set a regular improvement review (e.g., quarterly) to identify what to improve based on incidents, audits, risks, and feedback—then implement and track those improvements.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make improvement more structured by keeping an improvement list, assigning owners/dates, and confirming improvements are completed and measurable.`,
    },

    
    // MANDATORY CLAUSE RECOMMENDATIONS (ISO 27001 Clauses 4–10)
    // Stage 1 questions are grouped to these IDs:
    // CL4_CONTEXT, CL5_LEADERSHIP, CL6_PLANNING, CL7_SUPPORT,
    // CL8_OPERATION, CL9_EVALUATION, CL10_IMPROVEMENT
    
    CL4_CONTEXT: {
      NOT_COMPLIANT: `${orgName} should formally identify and document its business purpose, strategic direction, relevant internal and external issues, interested parties, and the scope of the ISMS to ensure information security requirements are clearly defined and aligned with organizational objectives, as required by ISO/IEC 27001.`,
      PARTIALLY_COMPLIANT: `${orgName} should review and enhance its documentation of organizational context, interested parties, and ISMS scope to ensure completeness, consistency, and alignment with current business and security requirements, in line with ISO/IEC 27001.`,
    },
    CL5_LEADERSHIP: {
      NOT_COMPLIANT: `${orgName} should ensure top management demonstrates active commitment to information security by approving and supporting an information security policy, allocating necessary resources, and establishing clear direction and accountability, in accordance with ISO/IEC 27001.`,
      PARTIALLY_COMPLIANT: `${orgName} should strengthen leadership involvement in information security by improving policy communication, management oversight, and ongoing review of security performance, as recommended by ISO/IEC 27001.`,
    },
    CL6_PLANNING: {
      NOT_COMPLIANT: `${orgName} should establish a formal and repeatable information security risk assessment and risk treatment process, including documented decisions and mapped security controls, to systematically manage security risks in line with ISO/IEC 27001.`,
      PARTIALLY_COMPLIANT: `${orgName} should enhance its existing risk assessment and treatment processes by ensuring they are consistently applied, properly documented, and regularly reviewed, as required by ISO/IEC 27001.`,
    },
    CL7_SUPPORT: {
      NOT_COMPLIANT: `${orgName} should provide adequate resources, assign and document information security roles and responsibilities, and implement structured security awareness and training programs to ensure personnel are competent to support the ISMS, in accordance with ISO/IEC 27001.`,
      PARTIALLY_COMPLIANT: `${orgName} should improve its security support mechanisms by formalizing role assignments, maintaining competency records, and strengthening security awareness activities to ensure consistent staff capability, as recommended by ISO/IEC 27001.`,
    },
    CL8_OPERATION: {
      NOT_COMPLIANT: `${orgName} should define, document, and implement operational procedures for key security activities such as access management, backup, incident handling, and change management to ensure effective operation of information security controls, in line with ISO/IEC 27001.`,
      PARTIALLY_COMPLIANT: `${orgName} should strengthen operational security by ensuring documented procedures are consistently followed in day-to-day activities and supported by appropriate evidence, as required by ISO/IEC 27001.`,
    },
    CL9_EVALUATION: {
      NOT_COMPLIANT: `${orgName} should establish regular monitoring, internal audit, and management review activities to evaluate the effectiveness of information security controls and ISMS performance, as required by ISO/IEC 27001.`,
      PARTIALLY_COMPLIANT: `${orgName} should enhance its performance evaluation processes by improving the frequency, documentation, and management review of security metrics, audit findings, and incidents, in line with ISO/IEC 27001.`,
    },
    CL10_IMPROVEMENT: {
      NOT_COMPLIANT: `${orgName} should establish a formal process to record security incidents, audit findings, and non-conformities, track corrective actions to completion, and drive continual improvement of the ISMS, as required by ISO/IEC 27001.`,
      PARTIALLY_COMPLIANT: `${orgName} should strengthen its improvement processes by consistently tracking corrective actions and proactively identifying opportunities to enhance information security controls and ISMS effectiveness, in line with ISO/IEC 27001.`,
    },

    "A.5.1": {
      NOT_COMPLIANT:
        `${orgName} should create a clear Information Security Policy, get management approval, publish it to all staff (including new joiners), and assign an owner and review date. ${orgName} should also set a regular review cycle (at least annually and after major changes/incidents), re-approve the policy, and keep version history and evidence of review.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should update the policy to match how the organization operates, ensure everyone receives it and acknowledges it, and confirm it is consistently applied across teams. ${orgName} should also make reviews consistent by using a schedule, recording review outcomes/actions, and tracking updates to completion.`,
    },

    "A.5.2": {
      NOT_COMPLIANT:
        `${orgName} should define key security responsibilities (governance, risk, access, incident handling, supplier security) and assign named owners for each. ${orgName} should document responsibilities (e.g. RACI) and communicate them to staff and teams, including what to do for approvals, exceptions, and incident reporting.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should clarify remaining gaps and overlaps, confirm accountability for key tasks, and define escalation paths. ${orgName} should ensure documentation is up to date, accessible, and understood by all relevant roles, with periodic refresh and evidence of communication.`,
    },

    "A.5.3": {
      NOT_COMPLIANT:
        `${orgName} should identify high-risk activities (payments, admin changes, access approvals, code releases) and enforce separation so no single person can approve and execute the same critical action (e.g. maker-checker, dual approval, independent review). ${orgName} should run basic awareness so staff know security rules, who approves access, how to report incidents, and who to contact for security help.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should expand segregation to all critical processes, formalize approval workflows, and periodically review exceptions and conflicts. ${orgName} should make awareness consistent through onboarding and refresh, include role-specific responsibilities, and track completion and understanding.`,
    },

    "A.5.4": {
      NOT_COMPLIANT:
        `${orgName} should make managers accountable for enforcing key security practices (training completion, acceptable use, access approvals, secure handling) and include this in routine team oversight. ${orgName} should implement a clear process for managers to log, investigate, and resolve security issues with deadlines, ownership, and escalation if delayed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize how managers monitor and reinforce security (e.g. checklists, periodic reviews, follow-up on non-compliance) and improve consistency by tracking actions to closure, recording evidence of fixes, and reviewing repeat issues to prevent recurrence.`,
    },

    "A.5.5": {
      NOT_COMPLIANT:
        `${orgName} should define which authorities, regulators, law enforcement, and key contacts may be needed, maintain an up-to-date contact list, and link it to the incident response plan.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should keep the list current (with owners and a review cycle), and ensure relevant staff know when and how to engage authorities.`,
    },

    "A.5.6": {
      NOT_COMPLIANT:
        `${orgName} should identify relevant communities (industry groups, CERT/CSIRT feeds, vendor security advisories) and assign someone to monitor and share relevant updates.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make participation effective by defining what is monitored, how updates are triaged, and how learnings feed into risk and controls.`,
    },

    "A.5.7": {
      NOT_COMPLIANT:
        `${orgName} should set up a basic threat intel process (sources and frequency), assess relevance, and convert key items into actions (patching, alerts, user warnings, risk updates).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by documenting the process, ensuring regular review, and keeping evidence of decisions and actions taken.`,
    },

    "A.5.8": {
      NOT_COMPLIANT:
        `${orgName} should embed security in projects from the start (requirements, architecture review, secure configuration, data classification, access design). ${orgName} should perform a project risk assessment before implementation (data, access, supplier/cloud use, change impact) and record outcomes and required controls.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure security is applied to all projects consistently by defining clear security checkpoints in the project lifecycle, standardizing the assessment method, keeping records, and verifying required controls are implemented before go-live.`,
    },

    "A.5.9": {
      NOT_COMPLIANT:
        `${orgName} should create and maintain an asset inventory covering key systems, devices, applications, data sets, and owners (including criticality and where data is stored). ${orgName} should assign ownership and a review cadence (e.g. quarterly) and update the inventory after changes.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete missing assets and owners, define minimum required fields, and reconcile the inventory against reality periodically. ${orgName} should improve consistency by aligning updates to change management and performing periodic audits to remove outdated entries.`,
    },

    "A.5.10": {
      NOT_COMPLIANT:
        `${orgName} should create an Acceptable Use Policy covering devices, email, internet, data handling, prohibited actions, and reporting requirements, and publish it to staff. ${orgName} should implement acknowledgement (signed or electronic) during onboarding and periodic refresh, and keep records for audit/compliance.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should update the AUP to reflect actual working practices (remote work, BYOD, cloud tools) and ensure it is consistently enforced. ${orgName} should ensure acknowledgements cover all staff and contractors, are renewed when policies change, and are monitored for completion.`,
    },

    "A.5.11": {
      NOT_COMPLIANT:
        `${orgName} should implement a formal leaver/mover process to recover assets and remove access promptly (accounts, keys, badges, devices), with a checklist and owner. ${orgName} should record each offboarding step (what was returned/removed, when, by whom) and retain evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make the process consistent across teams by standardizing it, integrating HR/IT triggers, and reviewing exceptions and delays. ${orgName} should improve completeness by ensuring every case is recorded and periodically sampling records for missed steps.`,
    },

    "A.5.12": {
      NOT_COMPLIANT:
        `${orgName} should define a simple classification scheme and handling rules (storage, sharing, encryption, retention) and assign owners for key data sets. ${orgName} should define how email is classified and handled (labels, warnings, encryption rules) and train staff to apply the rules consistently.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should expand coverage to all important information, align classification with real risk and legal requirements, and check consistency across teams. ${orgName} should improve email classification consistency by using standardized labels and templates, and technical enforcement where feasible.`,
    },

    "A.5.13": {
      NOT_COMPLIANT:
        `${orgName} should implement labeling aligned to classification (documents, email, storage) and define clear instructions for use and required protections.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should close gaps by ensuring labeling is used across key tools (email, docs, storage) and reinforcing correct handling through training and checks.`,
    },

    "A.5.14": {
      NOT_COMPLIANT:
        `${orgName} should define approved transfer methods and protections (secure sharing tools, encryption, access controls, approvals for high-risk transfers) and implement monitoring where appropriate. ${orgName} should implement email controls for sensitive data (labeling, encryption, restricted sharing, warnings/approvals, blocking risky recipients/attachments where needed).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize controls across channels (email, file sharing, cloud links, removable media), tune DLP/monitoring, and review repeated leak patterns. ${orgName} should improve email enforcement and consistency with clear exceptions, monitoring, and periodic review of email leakage risks.`,
    },

    "A.5.15": {
      NOT_COMPLIANT:
        `${orgName} should implement least-privilege access with approvals, role-based access where possible, and removal of access when no longer needed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should tighten high-risk access, ensure controls apply across all systems, and keep evidence of approvals and periodic reviews.`,
    },

    "A.5.16": {
      NOT_COMPLIANT:
        `${orgName} should implement a joiner/mover/leaver identity process with unique accounts, approvals, timely deprovisioning, and periodic checks for orphaned accounts.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize the process across all systems (including SaaS), improve timeliness, and automate provisioning/deprovisioning where feasible.`,
    },

    "A.5.17": {
      NOT_COMPLIANT:
        `${orgName} should define authentication standards (strong passwords, MFA for critical systems, secure resets, no sharing) and enforce them technically where possible.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should expand MFA coverage, strengthen reset processes, and ensure standards are consistently enforced across all systems and privileged accounts.`,
    },

    "A.5.18": {
      NOT_COMPLIANT:
        `${orgName} should implement regular access reviews (especially privileged and sensitive-data access), document decisions, and remove unnecessary access promptly with evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve review consistency and coverage across all key systems, track removals to closure, and report recurring issues.`,
    },

    "A.5.19": {
      NOT_COMPLIANT:
        `${orgName} should establish a supplier security process: identify in-scope suppliers, assess risks before onboarding, define required controls, control supplier access, and assign an owner for oversight.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make supplier risk management consistent by using a standard assessment, tracking remediation actions, reviewing supplier access regularly, and re-assessing on major changes.`,
    },

    "A.5.20": {
      NOT_COMPLIANT:
        `${orgName} should update supplier contracting to include minimum security clauses (confidentiality, data protection, access controls, incident notification, subcontractor controls, secure termination, assurance/audit rights as appropriate).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize clauses by supplier risk level, close missing requirements in existing contracts, and maintain a review cycle to keep terms current.`,
    },

    "A.5.21": {
      NOT_COMPLIANT:
        `${orgName} should implement vendor security assessments for relevant IT suppliers (questionnaires and evidence), set minimum control expectations, and require remediation before granting access.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should apply assessments consistently, perform deeper reviews for high-risk suppliers, and track remediation actions and re-assessments over time.`,
    },

    "A.5.22": {
      NOT_COMPLIANT:
        `${orgName} should implement periodic supplier reviews (performance, incidents, access, assurance evidence) and define actions/escalation when requirements are not met.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make reviews consistent with a schedule, retain evidence of reviews/decisions, and track follow-up actions to completion.`,
    },

    "A.5.23": {
      NOT_COMPLIANT:
        `${orgName} should assess cloud risks (shared responsibility, data location, access, logging, supplier assurance) and implement cloud governance (secure configuration baselines, IAM, monitoring, incident handling).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize cloud risk assessments, improve configuration and access governance, and continuously monitor cloud security posture and supplier assurance.`,
    },

    "A.5.24": {
      NOT_COMPLIANT:
        `${orgName} should define and document an incident management approach (roles, reporting, triage, escalation, communications, and response steps) and ensure staff know how to report incidents. ${orgName} should implement an incident log capturing what happened, impact, timeline, actions, evidence, and closure approvals.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should formalize and test the approach (tabletop exercises), clarify roles, and ensure procedures are followed consistently. ${orgName} should improve completeness by standardizing templates, enforcing consistent recording, and reviewing records for quality and trends.`,
    },

    "A.5.25": {
      NOT_COMPLIANT:
        `${orgName} should define event triage and classification (severity levels, criteria, escalation rules) and ensure it is applied consistently with evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve timeliness and consistency of triage and keep records of classification decisions and escalations for trend analysis.`,
    },

    "A.5.26": {
      NOT_COMPLIANT:
        `${orgName} should define incident response steps (containment, eradication, recovery, communications), assign owners, and keep evidence of actions taken for each incident.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize playbooks for common incidents, ensure documentation and approvals are captured, and validate readiness through exercises.`,
    },

    "A.5.27": {
      NOT_COMPLIANT:
        `${orgName} should perform post-incident reviews, identify root causes and improvement actions, update controls/procedures/training, and track actions to completion.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure reviews happen for all significant incidents, prioritize high-risk lessons, and verify corrective actions are effective.`,
    },

    "A.5.28": {
      NOT_COMPLIANT:
        `${orgName} should implement a simple RCA process for serious incidents (causal analysis, contributing factors, corrective actions) and document outcomes and approvals. ${orgName} should define evidence handling procedures (collection, secure storage, integrity, retention, chain-of-custody where needed) and train responders.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve RCA consistency and ensure actions are tracked to closure and validated for effectiveness. ${orgName} should strengthen evidence handling by making procedures consistent, protecting evidence from tampering, and defining retention and ownership clearly.`,
    },

    "A.5.29": {
      NOT_COMPLIANT:
        `${orgName} should define secure disruption-mode procedures (secure comms, emergency access controls, protected backups, controlled exceptions) to maintain security under stress.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should validate and improve these mechanisms through continuity and incident exercises and document and approve any emergency exceptions.`,
    },

    "A.5.30": {
      NOT_COMPLIANT:
        `${orgName} should identify critical services, define recovery targets (RTO/RPO), implement recovery mechanisms (backups, redundancy where needed), and assign continuity ownership. ${orgName} should document a BCP/ITDR plan covering disruption scenarios, roles, communication, recovery steps, and dependencies (including suppliers/cloud).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve coverage for all critical services and regularly test recovery (including restores) with documented results and follow-up actions. ${orgName} should keep the plan current, improve test frequency and quality, and track improvements identified during tests to completion.`,
    },

    "A.5.31": {
      NOT_COMPLIANT:
        `${orgName} should maintain a compliance requirements register (laws, regulations, contracts) with owners, applicability, and mapping to controls/policies and evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should keep the register current, review changes regularly, and ensure obligations are implemented and evidenced consistently.`,
    },

    "A.5.32": {
      NOT_COMPLIANT:
        `${orgName} should define IP protection rules (licensing compliance, handling of copyrighted materials, protection of internal designs/source), assign ownership, and train staff.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by inventorying licensed software and assets, checking compliance periodically, and strengthening controls for sensitive IP access and sharing.`,
    },

    "A.5.33": {
      NOT_COMPLIANT:
        `${orgName} should define record retention and integrity requirements, control access, implement backups and recoverability, and protect records from unauthorized modification.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should extend controls to all critical records, improve integrity and retention consistency, and test recovery and review retention/disposal regularly.`,
    },

    "A.5.34": {
      NOT_COMPLIANT:
        `${orgName} should identify where PII is processed, implement access controls and secure processing, define retention and deletion, manage supplier handling, and ensure breach/incident procedures cover PII.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete PII inventories and risk checks, apply controls consistently across all systems and suppliers, and keep evidence of ongoing privacy compliance reviews.`,
    },

    "A.5.35": {
      NOT_COMPLIANT:
        `${orgName} should schedule independent security reviews/audits (internal or external), document findings, and track corrective actions with owners and deadlines.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve review scope and frequency, keep evidence, and verify that corrective actions are effective after implementation.`,
    },

    "A.5.36": {
      NOT_COMPLIANT:
        `${orgName} should implement compliance monitoring (spot checks, audits, control checks), record non-compliance, and track fixes to closure with evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make checks consistent, retain evidence of outcomes, and address repeat issues via root-cause improvements.`,
    },

    "A.5.37": {
      NOT_COMPLIANT:
        `${orgName} should document key operating procedures (access, backups, changes, incident handling, supplier onboarding), keep them accessible, version-controlled, and owned.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should fill remaining gaps, keep procedures updated as systems change, and periodically verify procedures are followed and effective.`,
    },

    "A.6.1": {
      NOT_COMPLIANT:
        `${orgName} should implement a role-appropriate screening process for employees and contractors (for example identity verification, reference checks, and verification of right to work where applicable) before granting access to systems or sensitive information. Document the checks performed and the approval to proceed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make screening consistent by defining which roles require which checks, ensuring checks are completed before access is granted, retaining evidence of outcomes, and periodically reviewing the process for completeness and compliance with local laws.`,
    },

    "A.6.2": {
      NOT_COMPLIANT:
        `${orgName} should include clear information security responsibilities in employment and contractor agreements, including obligations to follow policies, protect confidential information, report incidents promptly, and comply with acceptable use and access rules.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should review and update security responsibilities so they remain clear and enforceable, ensure all staff and contractors are covered, and keep records that the terms were communicated and accepted.`,
    },

    "A.6.3": {
      NOT_COMPLIANT:
        `${orgName} should implement an information security awareness and training program covering key topics (for example phishing, password hygiene, secure handling of information, and reporting of incidents), with onboarding training and periodic refreshers for all staff and contractors.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen training by ensuring full coverage (including contractors), tailoring training by role (for example privileged administrators and developers), updating content for current threats, and tracking completion with evidence.`,
    },

    "A.6.4": {
      NOT_COMPLIANT:
        `${orgName} should define and document a disciplinary process for information security violations that is fair, consistent, and aligned with human resources practices, including investigation steps, escalation paths, and potential outcomes.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should apply the disciplinary process consistently by documenting cases, retaining evidence of decisions, ensuring managers and human resources know how to use the process, and periodically reviewing outcomes for consistency.`,
    },

    "A.6.5": {
      NOT_COMPLIANT:
        `${orgName} should implement a joiner, mover, and leaver process to promptly remove or adjust access rights and recover organizational assets when people leave or change roles, using a checklist with clear ownership and evidence of completion.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen offboarding and role-change controls by integrating human resources and information technology triggers, measuring timeliness (for example same-day deprovisioning for leavers), and periodically reviewing records to confirm the process is consistently followed.`,
    },

    "A.6.6": {
      NOT_COMPLIANT:
        `${orgName} should require confidentiality or non-disclosure agreements for employees, contractors, and third parties with access to sensitive information, including clear definitions of confidential information and obligations during and after engagement.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure confidentiality terms remain effective by reviewing templates periodically, confirming agreements are signed before access is granted, and maintaining retrievable records for audits and legal needs.`,
    },

    "A.6.7": {
      NOT_COMPLIANT:
        `${orgName} should define and implement remote working security controls, including approved devices, secure configuration, device encryption, strong authentication (including multi-factor authentication (MFA) where appropriate), secure remote access (for example a virtual private network (VPN)), and guidance for using home or public networks safely.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve remote working security by ensuring controls apply consistently to all remote workers, verifying device compliance (for example patching and encryption), strengthening monitoring for remote access, and regularly refreshing guidance and training based on observed issues.`,
    },

    "A.6.8": {
      NOT_COMPLIANT:
        `${orgName} should provide clear, accessible reporting channels for suspected security events and incidents (for example a dedicated email address, phone number, or ticketing route), define what to report and expected response times, and ensure staff know how to use the process.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen incident reporting by improving staff awareness, ensuring reports are triaged consistently, tracking handling to closure with evidence, and periodically reviewing trends to improve controls and training.`,
    },

    "A.7.1": {
      NOT_COMPLIANT:
        `${orgName} should define security perimeters and identify secure areas that contain sensitive information or systems, then implement physical access controls (for example locked doors, access cards, or supervised entry) to prevent unauthorized physical access.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen physical access protection by standardizing how access is granted and removed, maintaining an up-to-date list of authorized personnel for secure areas, and periodically reviewing controls and access logs for effectiveness.`,
    },

    "A.7.2": {
      NOT_COMPLIANT:
        `${orgName} should implement physical entry controls for premises, including visitor registration, identity verification where appropriate, issuing visitor badges, escorting visitors in non-public areas, and defining rules for deliveries and contractors.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve entry controls by ensuring visitor logs are complete, retained, and reviewed when needed, and by applying supervision and badge controls consistently across all sites and teams.`,
    },

    "A.7.3": {
      NOT_COMPLIANT:
        `${orgName} should design and implement appropriate physical security for offices, rooms, and facilities (for example locks, barriers, and secure area zoning) based on risk, ensuring protection for areas that host sensitive work, devices, or information.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen physical protections by addressing gaps in locks and barriers, ensuring secure areas are clearly defined and protected, and verifying that controls remain effective as layouts and operations change.`,
    },

    "A.7.4": {
      NOT_COMPLIANT:
        `${orgName} should implement physical security monitoring appropriate to the risk (for example alarms, access logging, and closed-circuit television (CCTV) in critical areas) so unauthorized access attempts can be detected and responded to promptly.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve monitoring by ensuring coverage is appropriate, recordings and logs are retained securely, systems are maintained, and monitoring outputs are reviewed with clear ownership and escalation procedures.`,
    },

    "A.7.5": {
      NOT_COMPLIANT:
        `${orgName} should protect facilities and information and communication technology equipment from physical and environmental threats (for example fire, flooding, overheating, and power instability) using appropriate safeguards such as fire detection, controlled temperature and humidity, and suitable placement of equipment.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen environmental protection by reviewing coverage and maintenance of safeguards, ensuring controls align with business criticality, and documenting inspections and corrective actions.`,
    },

    "A.7.6": {
      NOT_COMPLIANT:
        `${orgName} should restrict working in secure areas to authorized personnel only, define rules for supervision and visitor handling, and ensure access is granted based on need with documented approvals.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve controls in secure areas by keeping access lists current, reviewing access logs periodically, strengthening supervision where required, and ensuring exceptions are approved and recorded.`,
    },

    "A.7.7": {
      NOT_COMPLIANT:
        `${orgName} should implement clear desk and clear screen practices, including locking screens when unattended, securing paper records, and preventing sensitive information from being left exposed in shared areas.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should reinforce clear desk and clear screen practices through awareness, periodic checks, and consistent enforcement, and ensure secure disposal is available for paper records and removable media.`,
    },

    "A.7.8": {
      NOT_COMPLIANT:
        `${orgName} should ensure information and communication technology equipment is securely located and protected against theft, tampering, and damage, including secure mounting where needed, restricted access to equipment rooms, and protection for portable devices.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve equipment protection by addressing placement risks, strengthening physical protections for high-risk devices, and documenting inspections and incidents to guide improvements.`,
    },

    "A.7.9": {
      NOT_COMPLIANT:
        `${orgName} should define and enforce rules for protecting organizational assets when off-premises (for example laptops, mobile devices, and storage media), including secure transport, avoiding unattended storage, and requiring encryption for devices that store sensitive information.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen off-premises asset protection by improving consistency of encryption and tracking, reinforcing user awareness, and ensuring incident reporting covers lost or stolen assets promptly.`,
    },

    "A.7.10": {
      NOT_COMPLIANT:
        `${orgName} should implement storage media handling procedures across the full lifecycle (use, transport, storage, reuse, and disposal), including labelling where appropriate, secure storage, controlled transfer, and secure destruction for sensitive media.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve media handling by applying procedures consistently, maintaining records for high-risk transfers and destruction, and periodically checking compliance with the process.`,
    },

    "A.7.11": {
      NOT_COMPLIANT:
        `${orgName} should protect critical systems from utility failures (for example power and cooling issues) by implementing appropriate safeguards such as an uninterruptible power supply (UPS), generator support where required, and monitoring of environmental conditions.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen utility protection by ensuring safeguards are maintained and tested, monitoring is in place, and response procedures exist for utility-related incidents, with evidence of checks and corrective actions.`,
    },

    "A.7.12": {
      NOT_COMPLIANT:
        `${orgName} should protect power and data cabling against damage, interference, and unauthorized access by using appropriate routing, physical protection, and access controls (for example secured conduits and locked risers where applicable).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen cabling protection by addressing high-risk routes, documenting cabling layouts where appropriate, and restricting access to cabling areas with periodic inspection.`,
    },

    "A.7.13": {
      NOT_COMPLIANT:
        `${orgName} should implement planned maintenance for equipment to keep it secure and reliable, using authorized personnel, ensuring maintenance is logged, and controlling tools and access during maintenance activities.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve maintenance by ensuring schedules cover all relevant equipment, records are complete, and any issues found during maintenance are tracked and resolved promptly.`,
    },

    "A.7.14": {
      NOT_COMPLIANT:
        `${orgName} should ensure secure removal of data before equipment is reused, returned, or disposed of, using approved methods for secure erasure or physical destruction where required, and retaining evidence that sanitization was completed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve disposal controls by applying sanitization consistently, keeping disposal and sanitization records, and verifying third-party disposal providers meet required security expectations.`,
    },

    "A.8.1": {
      NOT_COMPLIANT:
        `${orgName} should implement endpoint security controls for user devices, including secure configuration (hardening), timely patching, device encryption, screen lock, anti-malware protection, and the ability to remotely remove organizational data from lost or stolen devices where appropriate.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen endpoint controls by ensuring consistent coverage across all devices, monitoring compliance (for example patch and encryption status), and remediating gaps promptly with documented ownership and evidence.`,
    },

    "A.8.2": {
      NOT_COMPLIANT:
        `${orgName} should restrict and control privileged access by enforcing least privilege, using dedicated privileged accounts where appropriate, requiring approvals for privileged access, and logging privileged activities for monitoring and investigation.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen privileged access management by performing regular reviews, removing unnecessary privileges promptly, improving monitoring of privileged actions, and tightening controls for shared or generic administrative accounts.`,
    },

    "A.8.3": {
      NOT_COMPLIANT:
        `${orgName} should implement access restrictions for information and systems based on business need and job role, ensuring sensitive information is only accessible to authorized users and access is approved, documented, and removed when no longer required.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve access restrictions by completing role definitions, reviewing access periodically, tightening high-risk access (for example to sensitive data and administrative functions), and ensuring changes are tracked to completion.`,
    },

    "A.8.4": {
      NOT_COMPLIANT:
        `${orgName} should restrict access to source code, build pipelines, and development tools to authorized personnel only, using least privilege, strong authentication, and logging, and requiring approvals for changes to critical repositories and build configurations.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen source code protection by reviewing permissions regularly, enforcing branch protections and change approvals, monitoring access and changes, and promptly removing access when roles change.`,
    },

    "A.8.5": {
      NOT_COMPLIANT:
        `${orgName} should implement strong authentication controls, including secure password policies, secure account recovery and reset procedures, and multi-factor authentication (MFA) for privileged access and high-risk systems.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen authentication by expanding multi-factor authentication (MFA) coverage, tightening password and reset controls, and ensuring authentication requirements are implemented consistently across all critical systems.`,
    },

    "A.8.6": {
      NOT_COMPLIANT:
        `${orgName} should implement capacity management by monitoring usage and performance, forecasting growth, and ensuring system and service capacity (including staffing where relevant) remains adequate to meet business requirements and avoid availability issues.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve capacity management by defining thresholds and alerts, reviewing trends regularly, documenting decisions and actions, and validating that capacity planning covers critical services and dependencies.`,
    },

    "A.8.7": {
      NOT_COMPLIANT:
        `${orgName} should implement malware protection across endpoints and servers, including anti-malware tooling, timely updates, blocking known malicious content where feasible, and clear procedures for handling suspected malware infections.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen malware protection by ensuring coverage is complete, updates are timely, alerts are monitored, and user awareness reduces risky behavior that can introduce malware.`,
    },

    "A.8.8": {
      NOT_COMPLIANT:
        `${orgName} should implement a technical vulnerability management process to identify, assess, prioritize, and remediate vulnerabilities in systems, applications, and dependencies within defined timeframes, with clear ownership and evidence of remediation.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen vulnerability management by defining remediation targets, ensuring consistent scanning and tracking, prioritizing critical exposures, and verifying fixes (including re-scans or validation) with documented results.`,
    },

    "A.8.9": {
      NOT_COMPLIANT:
        `${orgName} should implement configuration management by defining approved secure configuration baselines, controlling configuration changes, restricting who can change settings, and regularly reviewing configurations to prevent drift and insecure settings.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen configuration management by documenting baselines fully, monitoring changes, reviewing high-risk settings periodically, and keeping evidence of reviews and corrective actions.`,
    },

    "A.8.10": {
      NOT_COMPLIANT:
        `${orgName} should implement secure deletion for information that is no longer required, including defined retention and disposal rules, approved deletion methods for different media types, and verification where appropriate (especially for sensitive information).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve deletion controls by applying the same retention and deletion rules across systems, keeping evidence for sensitive deletions where required, and periodically reviewing that deletion processes are effective.`,
    },

    "A.8.11": {
      NOT_COMPLIANT:
        `${orgName} should implement data masking for sensitive information where full details are not required (for example in test environments, analytics, or support workflows) so exposure is reduced while still enabling legitimate use.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen data masking by defining when masking is required, ensuring consistent implementation across relevant systems and datasets, and combining masking with other protections (for example access controls and encryption) where appropriate.`,
    },

    "A.8.12": {
      NOT_COMPLIANT:
        `${orgName} should implement controls to prevent data leakage, such as approved sharing channels, access restrictions, monitoring, and data loss prevention (DLP) controls where appropriate for sensitive information sharing.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen data leakage controls by tuning monitoring and data loss prevention (DLP) rules, covering all common channels (for example email, file sharing, and removable media), and reviewing incidents and near-misses to drive improvements.`,
    },

    "A.8.13": {
      NOT_COMPLIANT:
        `${orgName} should implement backups for critical systems and data, define backup scope and frequency based on business needs, protect backups from unauthorized access and tampering, and ensure backups support recovery objectives.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen backups by ensuring coverage is complete, performing regular restore tests with documented results, and addressing gaps such as missing systems, insufficient retention, or inadequate backup protection.`,
    },

    "A.8.14": {
      NOT_COMPLIANT:
        `${orgName} should implement redundancy for critical components and services (for example failover capabilities and resilient architecture) so availability can be maintained if primary systems fail.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen redundancy by validating coverage for critical services and dependencies, testing failover where feasible, and documenting the design and responsibilities for maintaining resilience.`,
    },

    "A.8.15": {
      NOT_COMPLIANT:
        `${orgName} should enable logging for key systems and security-relevant activities (for example authentication, privileged actions, and access to sensitive data), define what must be logged, and ensure logs support monitoring and incident investigation.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve logging by protecting logs from tampering, ensuring accurate timestamps, defining retention, and ensuring logs are reviewed appropriately with clear ownership and escalation.`,
    },

    "A.8.16": {
      NOT_COMPLIANT:
        `${orgName} should implement monitoring for systems and networks to detect suspicious or abnormal behavior, define alert thresholds and response steps, and ensure monitoring outputs are reviewed and acted on in a timely manner.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen monitoring by improving coverage and alert quality, ensuring review happens consistently, and linking detections to incident response workflows and corrective actions.`,
    },

    "A.8.17": {
      NOT_COMPLIANT:
        `${orgName} should synchronize clocks across systems using a consistent time source (for example Network Time Protocol (NTP)) so logs can be correlated accurately during monitoring and incident investigations.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve clock synchronization by ensuring all relevant systems are covered, monitoring time drift, and validating time synchronization configuration after significant changes.`,
    },

    "A.8.18": {
      NOT_COMPLIANT:
        `${orgName} should restrict and control the use of powerful utility programs and administrative tools that can bypass controls, including approvals for use, least privilege, logging of usage, and separation of duties where feasible.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen oversight by tightening access to these tools, improving monitoring and review of tool usage, and removing unnecessary tools or access rights from systems where they are not needed.`,
    },

    "A.8.19": {
      NOT_COMPLIANT:
        `${orgName} should control software installation on operational systems by defining who can install software, requiring approval and security review for new software, maintaining an inventory of installed software, and ensuring installations are logged and tracked.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen installation controls by applying the approval process consistently, covering third-party and open-source components, and reviewing installed software periodically to detect unauthorized or risky installations.`,
    },

    "A.8.20": {
      NOT_COMPLIANT:
        `${orgName} should implement network security controls such as firewalls, secure configuration, access controls, and secure remote access (for example a virtual private network (VPN)) to protect systems and information from unauthorized access.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen network security by improving segmentation, restricting inbound and outbound traffic, monitoring network activity, and reviewing firewall and network rules periodically to remove unnecessary exposure.`,
    },

    "A.8.21": {
      NOT_COMPLIANT:
        `${orgName} should secure network services by hardening configurations, restricting administrative access, monitoring service activity, and ensuring service providers and internal service owners meet defined security requirements.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve network service security by reviewing configurations and provider controls regularly, strengthening monitoring, and ensuring changes to network services follow change management with documented approvals.`,
    },

    "A.8.22": {
      NOT_COMPLIANT:
        `${orgName} should implement network segmentation to separate systems with different security requirements (for example user networks, server networks, and administrative networks) and limit lateral movement in case of compromise.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen segmentation by validating that segmentation controls are enforced, addressing gaps, and reviewing exceptions regularly with documented approvals.`,
    },

    "A.8.23": {
      NOT_COMPLIANT:
        `${orgName} should manage access to external websites by implementing filtering and security controls that reduce exposure to malicious and inappropriate content, and by defining acceptable browsing rules aligned to policy.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve web access controls by tuning filtering rules, monitoring trends and bypass attempts, and updating controls based on emerging threats and observed incidents.`,
    },

    "A.8.24": {
      NOT_COMPLIANT:
        `${orgName} should implement encryption for sensitive information in storage and in transit where appropriate, define approved cryptographic standards, and manage encryption keys securely with clear ownership and access controls.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen encryption by ensuring consistent coverage across systems and data flows, improving key management practices, and periodically reviewing cryptographic configurations and certificates to prevent misconfiguration and expiry issues.`,
    },

    "A.8.25": {
      NOT_COMPLIANT:
        `${orgName} should integrate security throughout the software development life cycle by defining secure development practices, roles and responsibilities, required security activities (for example design review and testing), and evidence requirements before release.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen secure development by ensuring security activities are consistently applied across teams and projects, tracked to completion, and reviewed for effectiveness with evidence.`,
    },

    "A.8.26": {
      NOT_COMPLIANT:
        `${orgName} should define application and system security requirements before development or acquisition (for example authentication, authorization, logging, encryption, privacy, and resilience requirements) and ensure requirements are reviewed and approved by appropriate stakeholders.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve requirements management by ensuring security requirements are consistently captured, updated when systems change, and verified during design, build, and testing with documented outcomes.`,
    },

    "A.8.27": {
      NOT_COMPLIANT:
        `${orgName} should apply secure architecture and design principles when building or changing systems, including threat-driven design considerations, separation of duties where needed, secure defaults, and protection of sensitive data flows.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen secure design by making reviews consistent, documenting decisions and exceptions, and tracking identified weaknesses and remediation actions to closure.`,
    },

    "A.8.28": {
      NOT_COMPLIANT:
        `${orgName} should implement secure coding practices and standards, ensure developers are trained on secure coding, and require peer review of changes to reduce vulnerabilities introduced during development.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen secure coding by improving consistency across teams, using checklists or standards for reviews, and tracking remediation of common coding weaknesses identified during reviews and testing.`,
    },

    "A.8.29": {
      NOT_COMPLIANT:
        `${orgName} should perform security testing before deploying systems to production, ensuring testing is appropriate to risk and includes verification of key security requirements, and that findings are prioritized and resolved before release.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen security testing by applying it consistently, protecting test environments and test data, ensuring remediation is tracked to closure, and keeping evidence of test scope, results, and approvals.`,
    },

    "A.8.30": {
      NOT_COMPLIANT:
        `${orgName} should ensure outsourced development is governed by defined security requirements, including secure development practices, access controls, incident notification, testing expectations, and rights to review assurance evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve oversight by monitoring delivery against security requirements, reviewing evidence of secure development and testing, and tracking remediation of issues identified with suppliers to completion.`,
    },

    "A.8.31": {
      NOT_COMPLIANT:
        `${orgName} should separate development, test, and production environments to reduce risk of unauthorized changes and data exposure, including separate access controls, restricted data movement, and clear rules for promoting changes to production.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen separation by tightening access boundaries, preventing production data from being used in lower environments unless protected appropriately, and reviewing environment access and data flows periodically.`,
    },

    "A.8.32": {
      NOT_COMPLIANT:
        `${orgName} should implement change management for systems and services, including risk assessment, review and approval, testing, rollback planning, and recording of changes with clear ownership and evidence of implementation.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen change management by applying the process consistently, improving the quality of change records (including risk and testing evidence), and reviewing changes periodically to identify repeat issues and control gaps.`,
    },

    "A.8.33": {
      NOT_COMPLIANT:
        `${orgName} should protect test data from unauthorized access and exposure by using synthetic or anonymized data where feasible, restricting access to test environments, and preventing sensitive production data from being copied into test without appropriate protections.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen test data protection by standardizing rules for data use, auditing access to test environments, and verifying that any sensitive data used for testing is protected and handled according to retention and disposal requirements.`,
    },

    "A.8.34": {
      NOT_COMPLIANT:
        `${orgName} should perform technical assurance activities (for example vulnerability assessment and penetration testing) in a controlled manner with defined scope, approvals, and safeguards to avoid disrupting operations and introducing new risks.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen technical assurance by planning and coordinating testing, defining rules of engagement, tracking findings and remediation to closure, and retaining evidence of scope, results, and approvals.`,
    },

    // ---------------------------------------------------------------------
    // Question-level rules (preferred): exact NO/PARTIAL text per question.
    // Keys are canonicalized to: A.<annex>.<control>[.<subcontrol>].Q<n>
    // Incoming ids like A5.1.Q1, A7.1_Q2, A.6.4-Q2 are normalized to match.
    // ---------------------------------------------------------------------

    // Annex A.5 (Organizational)
    "A.5.1.Q1": {
      NOT_COMPLIANT:
        `${orgName} should create a clear Information Security Policy, get management approval, publish it to all staff (including new joiners), and assign an owner and review date.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should update the policy to match how the organization operates, ensure everyone receives it and acknowledges it, and confirm it is consistently applied across teams.`,
    },
    "A.5.1.Q2": {
      NOT_COMPLIANT:
        `${orgName} should set a regular review cycle (at least annually and after major changes/incidents), re-approve the policy, and keep version history and evidence of review.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make reviews consistent by using a schedule, recording review outcomes/actions, and tracking updates to completion.`,
    },

    "A.5.2.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define key security responsibilities (governance, risk, access, incident handling, supplier security) and assign named owners for each.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should clarify remaining gaps/overlaps, confirm accountability for key tasks, and define escalation paths.`,
    },
    "A.5.2.Q2": {
      NOT_COMPLIANT:
        `${orgName} should document responsibilities (e.g., RACI) and communicate them to staff/teams, including what to do for approvals, exceptions, and incident reporting.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure documentation is up to date, accessible, and understood by all relevant roles, with periodic refresh and evidence of communication.`,
    },

    "A.5.3.Q1": {
      NOT_COMPLIANT:
        `${orgName} should identify high-risk activities (payments, admin changes, access approvals, code releases) and enforce separation (maker-checker, dual approval, independent review).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should expand segregation to all critical processes, formalize approval workflows, and periodically review exceptions and conflicts.`,
    },
    "A.5.3.Q2": {
      NOT_COMPLIANT:
        `${orgName} should run basic awareness so staff know security rules, who approves access, how to report incidents, and who to contact for security help.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make awareness consistent (onboarding + refresh), include role-specific responsibilities, and track completion/understanding.`,
    },

    "A.5.4.Q1": {
      NOT_COMPLIANT:
        `${orgName} should make managers accountable for enforcing key security practices (training completion, acceptable use, access approvals, secure handling) and include this in routine team oversight.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize how managers monitor and reinforce security (checklists, periodic reviews, follow-up on non-compliance).`,
    },
    "A.5.4.Q2": {
      NOT_COMPLIANT:
        `${orgName} should implement a clear process for managers to log, investigate, and resolve security issues with deadlines, ownership, and escalation if delayed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by tracking actions to closure, recording evidence of fixes, and reviewing repeat issues to prevent recurrence.`,
    },

    "A.5.5.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define which authorities/regulators/law enforcement and key contacts may be needed, maintain an up-to-date contact list, and link it to the incident response plan.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should keep the list current (owners + review cycle), and ensure relevant staff know when/how to engage authorities.`,
    },

    "A.5.6.Q1": {
      NOT_COMPLIANT:
        `${orgName} should identify relevant communities (industry groups, CERT/CSIRT feeds, vendor security advisories) and assign someone to monitor and share relevant updates.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make participation effective by defining what is monitored, how updates are triaged, and how learnings feed into risk and controls.`,
    },

    "A.5.7.Q1": {
      NOT_COMPLIANT:
        `${orgName} should set up a basic threat intel process (sources + frequency), assess relevance, and convert key items into actions (patching, alerts, user warnings, risk updates).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by documenting the process, ensuring regular review, and keeping evidence of decisions/actions taken.`,
    },

    "A.5.8.Q1": {
      NOT_COMPLIANT:
        `${orgName} should embed security in projects (requirements, architecture review, secure configuration, data classification, access design) from the start.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure security is applied to all projects consistently, not just some, and define clear “security checkpoints” in the project lifecycle.`,
    },
    "A.5.8.Q2": {
      NOT_COMPLIANT:
        `${orgName} should perform a simple project risk assessment before implementation (data, access, supplier/cloud use, change impact) and record outcomes and required controls.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize the assessment method, keep records, and verify required controls are implemented before go-live.`,
    },

    "A.5.9.Q1": {
      NOT_COMPLIANT:
        `${orgName} should create and maintain an asset inventory covering key systems, devices, applications, data sets, and owners (including criticality and where data is stored).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete missing assets/owners, define minimum required fields, and reconcile inventory against reality periodically.`,
    },
    "A.5.9.Q2": {
      NOT_COMPLIANT:
        `${orgName} should assign ownership and a review cadence (e.g., quarterly), update inventory after changes, and keep evidence of review.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by aligning updates to change management and performing periodic audits to remove outdated entries.`,
    },

    "A.5.10.Q1": {
      NOT_COMPLIANT:
        `${orgName} should create an Acceptable Use Policy covering devices, email, internet, data handling, prohibited actions, and reporting requirements, and publish it to staff.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should update the AUP to reflect actual working practices (remote work, BYOD, cloud tools), and ensure it is consistently enforced.`,
    },
    "A.5.10.Q2": {
      NOT_COMPLIANT:
        `${orgName} should implement acknowledgement (signed or electronic) during onboarding and periodic refresh, and keep records for audit/compliance.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure acknowledgements cover all staff/contractors, are renewed when policies change, and are monitored for completion.`,
    },

    "A.5.11.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement a formal leaver/mover process to recover assets and remove access promptly (accounts, keys, badges, devices), with a checklist and owner.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make this consistent across teams by standardizing the process, integrating HR/IT triggers, and reviewing exceptions and delays.`,
    },
    "A.5.11.Q2": {
      NOT_COMPLIANT:
        `${orgName} should record each offboarding step (what was returned/removed, when, by whom) and retain evidence (tickets, logs, sign-off).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve completeness by ensuring every case is recorded, periodically sampling records for missed steps, and correcting recurring gaps.`,
    },

    "A.5.12.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define a simple classification scheme and handling rules (storage, sharing, encryption, retention) and assign owners for key data sets.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should expand coverage to all important information, align classification with real risk/legal requirements, and check consistency across teams.`,
    },
    "A.5.12.Q2": {
      NOT_COMPLIANT:
        `${orgName} should define how email is classified/handled (labels, warnings, encryption rules), and train staff to apply the rules consistently.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by using standardized labels/templates and (where feasible) technical enforcement for sensitive email sharing.`,
    },

    "A.5.13.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement labeling aligned to classification (documents, email, storage) and define clear instructions for use and required protections.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should close gaps by ensuring labeling is used across key tools (email/docs/storage) and reinforcing correct handling through training and checks.`,
    },

    "A.5.14.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define approved transfer methods and protections (secure sharing tools, encryption, access controls, approvals for high-risk transfers) and implement monitoring where appropriate.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize controls across channels (email, file sharing, cloud links, removable media), tune DLP/monitoring, and review repeated leak patterns.`,
    },
    "A.5.14.Q2": {
      NOT_COMPLIANT:
        `${orgName} should implement email controls for sensitive data (labeling, encryption, restricted sharing, warnings/approvals, blocking risky recipients/attachments where needed).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve enforcement and consistency (coverage for all users, clear exceptions, monitoring and periodic review of email leakage risks).`,
    },

    "A.5.15.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement least-privilege access with approvals, role-based access where possible, and removal of access when no longer needed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should tighten high-risk access, ensure controls apply across all systems, and keep evidence of approvals and periodic reviews.`,
    },

    "A.5.16.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement a joiner/mover/leaver identity process with unique accounts, approvals, timely deprovisioning, and periodic checks for orphaned accounts.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize the process across all systems (including SaaS), improve timeliness, and automate provisioning/deprovisioning where feasible.`,
    },

    "A.5.17.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define authentication standards (strong passwords, MFA for critical systems, secure resets, no sharing) and enforce them technically where possible.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should expand MFA coverage, strengthen reset processes, and ensure standards are consistently enforced across all systems and privileged accounts.`,
    },

    "A.5.18.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement regular access reviews (especially privileged and sensitive-data access), document decisions, and remove unnecessary access promptly with evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve review consistency and coverage across all key systems, track removals to closure, and report recurring issues.`,
    },

    // Applicability-type: when answered NO/PARTIAL, give a short clarification action.
    // (This question decides whether supplier-related controls apply.)
    "A.5.19.Q1": {
      NOT_COMPLIANT:
        `${orgName} should confirm whether any external suppliers provide IT services or can access information/systems. If YES, identify the suppliers and complete supplier security controls (A.5.19–A.5.22). If truly NO, document the rationale and review this periodically as suppliers change.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete an inventory of external suppliers with IT access, confirm which are in scope, and ensure supplier-related controls (A.5.19–A.5.22) are applied consistently to the in-scope suppliers.`,
    },

    // Export/report gateway question used by Stage 5 (not an ISO Annex A id).
    // Keep wording practical: confirm applicability and implement secure development controls if in scope.
    "SDLC_GATE_Q1": {
      NOT_COMPLIANT:
        `${orgName} should confirm whether it develops or significantly customizes software (including via third parties). If YES, treat secure development controls as in scope and implement the SDLC-related controls (A.8.25–A.8.29, A.8.31, A.8.33). If NO, document the rationale and review it when the organization’s delivery model changes.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should clarify the scope of software development/customization (internal and outsourced), and ensure secure development controls are applied to all in-scope software changes consistently.`,
    },
    "A.5.19.Q2": {
      NOT_COMPLIANT:
        `${orgName} should establish a supplier security process: identify in-scope suppliers, assess risks before onboarding, define required controls, control supplier access, and assign an owner for oversight.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make supplier risk management consistent by using a standard assessment, tracking remediation actions, reviewing supplier access regularly, and re-assessing on major changes.`,
    },

    "A.5.20.Q1": {
      NOT_COMPLIANT:
        `${orgName} should update supplier contracting to include minimum security clauses (confidentiality, data protection, access controls, incident notification, subcontractor controls, secure termination, assurance/audit rights as appropriate).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize clauses by supplier risk level, close missing requirements in existing contracts, and maintain a review cycle to keep terms current.`,
    },

    "A.5.21.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement vendor security assessments for relevant IT suppliers (questionnaires + evidence), set minimum control expectations, and require remediation before granting access.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should apply assessments consistently, perform deeper reviews for high-risk suppliers, and track remediation actions and re-assessments over time.`,
    },

    "A.5.22.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement periodic supplier reviews (performance, incidents, access, assurance evidence) and define actions/escalation when requirements are not met.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make reviews consistent with a schedule, retain evidence of reviews/decisions, and track follow-up actions to completion.`,
    },

    // Applicability-type: when answered NO/PARTIAL, provide a short clarification action.
    "A.5.23.Q1": {
      NOT_COMPLIANT:
        `${orgName} should confirm whether any cloud services are used to store, process, or transmit information (including SaaS like email, file storage, CRM, accounting). If YES, complete cloud security controls (A.5.23 and related governance). If NO, document the rationale and review periodically as technology choices change.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete an inventory of cloud services in use (SaaS/PaaS/IaaS), confirm which are in scope, and ensure cloud security controls and governance are applied consistently to all in-scope services.`,
    },
    "A.5.23.Q2": {
      NOT_COMPLIANT:
        `${orgName} should assess cloud risks (shared responsibility, data location, access, logging, supplier assurance) and implement cloud governance (secure configuration baselines, IAM, monitoring, incident handling).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize cloud risk assessments, improve configuration and access governance, and continuously monitor cloud security posture and supplier assurance.`,
    },

    "A.5.24.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define and document an incident management approach (roles, reporting, triage, escalation, communications, and response steps) and ensure staff know how to report incidents.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should formalize and test the approach (tabletop exercises), clarify roles, and ensure procedures are followed consistently.`,
    },
    "A.5.24.Q2": {
      NOT_COMPLIANT:
        `${orgName} should implement an incident log/register capturing what happened, impact, timeline, actions, evidence, and closure approvals; keep it consistently for every incident.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve completeness by standardizing templates, enforcing consistent recording, and reviewing records for quality and trends.`,
    },

    "A.5.25.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define event triage and classification (severity levels, criteria, escalation rules) and ensure it is applied consistently with evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve timeliness/consistency of triage and keep records of classification decisions and escalations for trend analysis.`,
    },

    "A.5.26.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define incident response steps (containment, eradication, recovery, communications), assign owners, and keep evidence of actions taken for each incident.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize playbooks for common incidents, ensure documentation/approvals are captured, and validate readiness through exercises.`,
    },

    "A.5.27.Q1": {
      NOT_COMPLIANT:
        `${orgName} should perform post-incident reviews, identify root causes and improvement actions, update controls/procedures/training, and track actions to completion.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure reviews happen for all significant incidents, prioritize high-risk lessons, and verify corrective actions are effective.`,
    },

    "A.5.28.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement a simple RCA process for serious incidents (causal analysis, contributing factors, corrective actions) and document outcomes and approvals.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve RCA consistency and ensure actions are tracked to closure and validated for effectiveness.`,
    },
    "A.5.28.Q2": {
      NOT_COMPLIANT:
        `${orgName} should define evidence handling procedures (collection, secure storage, integrity, retention, chain-of-custody where needed) and train responders.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen evidence handling by making procedures consistent, protecting evidence from tampering, and defining retention/ownership clearly.`,
    },

    "A.5.29.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define secure “disruption mode” procedures (secure comms, emergency access controls, protected backups, controlled exceptions) to maintain security under stress.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should validate and improve these mechanisms through continuity/incident exercises and document/approve any emergency exceptions.`,
    },

    "A.5.30.Q1": {
      NOT_COMPLIANT:
        `${orgName} should identify critical services, define recovery targets (RTO/RPO), implement recovery mechanisms (backups, redundancy where needed), and assign continuity ownership.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve coverage for all critical services and regularly test recovery (including restores) with documented results and follow-up actions.`,
    },
    "A.5.30.Q2": {
      NOT_COMPLIANT:
        `${orgName} should document a BCP/ITDR plan covering disruption scenarios, roles, communication, recovery steps, and dependencies (including suppliers/cloud). Test it periodically.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should keep the plan current, improve test frequency/quality, and track improvements identified during tests to completion.`,
    },

    "A.5.31.Q1": {
      NOT_COMPLIANT:
        `${orgName} should maintain a compliance requirements register (laws, regulations, contracts) with owners, applicability, and mapping to controls/policies and evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should keep the register current, review changes regularly, and ensure obligations are implemented and evidenced consistently.`,
    },

    "A.5.32.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define IP protection rules (licensing compliance, handling of copyrighted materials, protection of internal designs/source), assign ownership, and train staff.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by inventorying licensed software/assets, checking compliance periodically, and strengthening controls for sensitive IP access and sharing.`,
    },

    "A.5.33.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define record retention and integrity requirements, control access, implement backups and recoverability, and protect records from unauthorized modification.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should extend controls to all critical records, improve integrity/retention consistency, and test recovery and review retention/disposal regularly.`,
    },

    "A.5.34.Q1": {
      NOT_COMPLIANT:
        `${orgName} should identify where PII is processed, implement access controls and secure processing, define retention/deletion, manage supplier handling, and ensure breach/incident procedures cover PII.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete PII inventories and risk checks, apply controls consistently across all systems/suppliers, and keep evidence of ongoing privacy compliance reviews.`,
    },

    "A.5.35.Q1": {
      NOT_COMPLIANT:
        `${orgName} should schedule independent security reviews/audits (internal or external), document findings, and track corrective actions with owners and deadlines.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve review scope/frequency, keep evidence, and verify that corrective actions are effective after implementation.`,
    },

    "A.5.36.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement compliance monitoring (spot checks, audits, control checks), record non-compliance, and track fixes to closure with evidence.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make checks consistent, retain evidence of outcomes, and address repeat issues via root-cause improvements.`,
    },

    "A.5.37.Q1": {
      NOT_COMPLIANT:
        `${orgName} should document key operating procedures (access, backups, changes, incident handling, supplier onboarding), keep them accessible, version-controlled, and owned.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should fill remaining gaps, keep procedures updated as systems change, and periodically verify procedures are followed and effective.`,
    },

    // Annex A.6 (People)
    "A.6.1.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define pre-employment screening requirements by role (identity, employment history, education/qualifications, and other checks allowed by local law), obtain consent where required, and keep evidence that checks were completed before access is granted.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make screening consistent by applying the same role-based criteria for all relevant hires, documenting outcomes, handling exceptions with approval, and periodically reviewing the screening process for completeness.`,
    },

    "A.6.2.Q1": {
      NOT_COMPLIANT:
        `${orgName} should update employment and contractor terms to clearly include information security responsibilities (confidentiality, acceptable use, protection of credentials, incident reporting, and consequences for violations).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure responsibilities are complete and consistently included for all staff and contractors, communicated during onboarding, and reviewed when roles or risks change.`,
    },

    "A.6.3.Q1": {
      NOT_COMPLIANT:
        `${orgName} should deliver onboarding and at least annual security awareness training covering phishing, passwords, safe data handling, secure remote work, and incident reporting, and track attendance and completion.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve training consistency by ensuring all staff are covered (including contractors), tailoring training by role, and checking understanding (short assessment) with recorded results.`,
    },
    "A.6.3.Q2": {
      NOT_COMPLIANT:
        `${orgName} should define triggers to update training (policy changes, new threats, incidents, new technology) and refresh training content accordingly, with version control and review dates.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make updates timely and repeatable by assigning an owner, keeping an update schedule, and ensuring staff complete the updated training when major changes occur.`,
    },

    "A.6.4.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define a disciplinary process for information security violations (reporting, investigation, decision-making, proportional actions, and documentation) aligned with human resources and legal requirements.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure the process is applied consistently, decisions are documented, and repeated violations are analyzed to improve underlying controls and training.`,
    },
    "A.6.4.Q2": {
      NOT_COMPLIANT:
        `${orgName} should document the disciplinary process and communicate it to all staff (including new joiners), with acknowledgement where appropriate.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve communication by making it easy to find, reinforcing it during training, and confirming staff understand escalation and consequences.`,
    },

    "A.6.5.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement a joiner/mover/leaver process that triggers immediate access changes and asset return (accounts, devices, badges, keys), with clear owners and deadlines.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make the process consistent across all systems by integrating it with human resources workflows, tracking completion for every case, and periodically checking for orphaned accounts or missed assets.`,
    },

    "A.6.6.Q1": {
      NOT_COMPLIANT:
        `${orgName} should require confidentiality agreements for employees and relevant third parties before they access sensitive information, and store signed evidence securely.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure coverage is complete (all relevant roles and suppliers), terms match current data handling needs, and exceptions are formally approved.`,
    },
    "A.6.6.Q2": {
      NOT_COMPLIANT:
        `${orgName} should set a review cycle (for example annually and when laws/contracts change) to update confidentiality terms and templates, with legal review where needed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make reviews consistent by tracking agreement versions, refreshing older agreements when material changes occur, and confirming renewed acceptance where required.`,
    },

    "A.6.7.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define and implement remote working controls, such as secure device configuration, encryption, secure access (for example a virtual private network (VPN) where appropriate), approved collaboration tools, and guidance for secure home network use.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen remote working security by applying controls consistently to all remote users, improving monitoring and patching, and reinforcing expectations through training and periodic checks.`,
    },

    "A.6.8.Q1": {
      NOT_COMPLIANT:
        `${orgName} should provide simple reporting channels (email alias, ticket form, hotline/chat) with clear instructions, triage ownership, and response targets, and ensure reports are logged.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve reporting by ensuring channels are always accessible, triage is timely, and outcomes are documented and tracked to closure.`,
    },
    "A.6.8.Q2": {
      NOT_COMPLIANT:
        `${orgName} should train staff on what to report (phishing, lost devices, suspicious access, data leaks) and how to report quickly, as part of onboarding and regular refresh.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve effectiveness by reinforcing training periodically, using short simulations or examples, and tracking completion and understanding.`,
    },

    // Annex A.7 (Physical)
    "A.7.1.Q1": {
      NOT_COMPLIANT:
        `${orgName} should identify areas containing sensitive information/systems and define physical security boundaries (rooms, cabinets, server areas), documenting what is “restricted” and what protections apply.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should complete boundary definitions for all relevant areas, keep them current, and ensure protections match risk (especially for critical systems and sensitive data).`,
    },
    "A.7.1.Q2": {
      NOT_COMPLIANT:
        `${orgName} should restrict access to secure areas (locks, access cards/keys, visitor controls) and implement monitoring appropriate to risk (for example logs or alarms).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen control by reviewing who has access regularly, removing unnecessary access, and improving monitoring and response for access violations.`,
    },

    "A.7.2.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement entry controls for premises (controlled doors, reception process, and visitor management) to prevent unauthorized entry.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by ensuring controls cover all entrances, after-hours access is controlled, and exceptions are approved and recorded.`,
    },
    "A.7.2.Q2": {
      NOT_COMPLIANT:
        `${orgName} should record visitors (name, organization, host, time in/out, purpose) and require escorting where appropriate, retaining records for an agreed period.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure visitor logging is complete and consistent, and periodically review records for anomalies or repeated access issues.`,
    },

    "A.7.3.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement basic facility protections (locks, controlled access to sensitive rooms, secure storage for sensitive materials) based on risk.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should close gaps by expanding protections to all sensitive rooms and ensuring designs are consistent across sites.`,
    },
    "A.7.3.Q2": {
      NOT_COMPLIANT:
        `${orgName} should deploy suitable locks and barriers and, where necessary, monitoring systems to protect sensitive areas and equipment from unauthorized access.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by standardizing controls, maintaining them, and ensuring monitoring is actively used and responded to.`,
    },

    "A.7.4.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement physical monitoring appropriate to risk (for example closed-circuit television (CCTV), intrusion alarms, or access logs) and define who reviews alerts and how response is handled.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should ensure monitoring is consistently operational, retained for an appropriate period, and reviewed with documented follow-up actions.`,
    },

    "A.7.5.Q1": {
      NOT_COMPLIANT:
        `${orgName} should assess physical and environmental risks and implement protections such as fire detection/suppression, water leakage protection, temperature/humidity control, surge protection, and safe equipment placement.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by ensuring protections cover all critical areas, maintenance checks are performed, and gaps found during incidents/tests are tracked to completion.`,
    },

    "A.7.6.Q1": {
      NOT_COMPLIANT:
        `${orgName} should restrict secure areas to authorized personnel only, enforce visitor escorting, and ensure access permissions are approved and recorded.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by reviewing access lists regularly, tightening controls for high-risk areas, and recording and investigating access violations.`,
    },

    "A.7.7.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement clear desk and screen requirements, including automatic screen locking and guidance for handling paper records and removable media.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency through training, periodic checks, and enforcement for repeated non-compliance.`,
    },
    "A.7.7.Q2": {
      NOT_COMPLIANT:
        `${orgName} should document clear screen requirements (lock when unattended, no shared unlocked workstations, secure viewing in public spaces) and communicate them to staff.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should update and reinforce the policy to match real working patterns (remote/hybrid) and ensure technical settings support it.`,
    },

    "A.7.8.Q1": {
      NOT_COMPLIANT:
        `${orgName} should site equipment securely (restricted areas, locked cabinets where needed), protect it from environmental damage, and prevent unauthorized handling.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by improving consistency across all locations and ensuring protection is appropriate for equipment containing sensitive information.`,
    },

    "A.7.9.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define controls for off-site assets (device encryption, secure transport/storage, reporting loss quickly, and restricting use in public places) and ensure staff follow them.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by applying controls to all relevant devices, ensuring compliance checks, and improving incident handling for lost/stolen devices.`,
    },
    "A.7.9.Q2": {
      NOT_COMPLIANT:
        `${orgName} should train staff on protecting devices and information during remote work (secure storage, safe printing, avoiding shared devices, and reporting loss).`,
      PARTIALLY_COMPLIANT:
        `${orgName} should reinforce training periodically, include practical scenarios, and track completion and understanding.`,
    },

    "A.7.10.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define procedures for storage media handling (use, labeling, secure storage, transport, reuse, and disposal) and ensure media containing sensitive data is protected and tracked.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by tracking high-risk media, standardizing disposal methods, and documenting evidence of secure disposal or wiping.`,
    },

    "A.7.11.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement protections so utilities do not disrupt critical systems, such as backup power, surge protection, and safe shutdown procedures appropriate to risk.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by ensuring protections cover all critical equipment and are maintained and tested periodically with recorded results.`,
    },

    "A.7.12.Q1": {
      NOT_COMPLIANT:
        `${orgName} should protect cabling (secure routing, protected conduits, restricted cable rooms) to reduce risks of tampering, interception, and accidental damage.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by identifying high-risk cabling routes, strengthening physical protection, and controlling access to cabling infrastructure.`,
    },

    "A.7.13.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement planned maintenance for critical equipment and systems (including security updates where applicable), and keep records of maintenance activities.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make maintenance consistent by covering all critical assets, keeping schedules and evidence, and tracking maintenance issues to resolution.`,
    },

    "A.7.14.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement secure data removal before reuse/disposal (secure wiping or physical destruction appropriate to risk) and retain evidence of completion.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by applying the process consistently to all assets, using approved methods, and keeping auditable records of disposal and data removal.`,
    },

    // Annex A.8 (Technological)
    "A.8.1.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement baseline endpoint protections (device encryption, screen lock, anti-malware, timely patching, and device management) for all devices that access organizational information.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should make protections consistent across all devices, verify compliance (reporting), and improve controls for high-risk users and sensitive data access.`,
    },

    "A.8.2.Q1": {
      NOT_COMPLIANT:
        `${orgName} should tightly control privileged access using approvals, least privilege, separate admin accounts, and strong authentication such as multi-factor authentication (MFA), with logging of privileged actions.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by reviewing privileged accounts regularly, removing unnecessary privileges, and improving monitoring and approval evidence.`,
    },

    "A.8.3.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement role-based access and need-to-know rules for sensitive information, including approvals and periodic access reviews.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency across systems and ensure access reviews result in timely removal of unnecessary access.`,
    },

    "A.8.4.Q1": {
      NOT_COMPLIANT:
        `${orgName} should restrict source code and development tool access to authorized roles only, use strong authentication, and log access and changes.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by enforcing least privilege, reviewing access regularly, and ensuring changes are traceable through change history and approvals.`,
    },

    "A.8.5.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement strong authentication for critical systems, including multi-factor authentication (MFA) and strong password standards, and secure account recovery procedures.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should expand coverage to all critical services and privileged accounts, and ensure authentication standards are consistently enforced.`,
    },

    "A.8.6.Q1": {
      NOT_COMPLIANT:
        `${orgName} should monitor system and service capacity (performance, storage, availability) and plan for growth so critical services remain reliable, with thresholds and owners for action.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by making monitoring consistent across critical services, reviewing trends regularly, and documenting capacity actions and outcomes.`,
    },

    "A.8.7.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement anti-malware protections, secure configuration, timely patching, and user awareness to reduce malicious software infections.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by ensuring protections are consistently deployed, monitored, and updated, and by reviewing incidents to improve controls.`,
    },

    "A.8.8.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement a vulnerability management process: asset scope, vulnerability scanning, prioritization by risk, patching/remediation timelines, and verification of fixes; use testing such as vulnerability assessment and penetration testing (VAPT) where appropriate.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by applying consistent timelines, tracking remediation to closure, and reporting overdue high-risk vulnerabilities to management.`,
    },

    "A.8.9.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define secure configuration baselines, control changes through approvals, and document and review configuration changes for critical systems.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by expanding baseline coverage, detecting unauthorized changes, and performing periodic configuration reviews.`,
    },

    "A.8.10.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define retention and deletion rules and implement secure deletion methods for systems and storage, ensuring data is removed when no longer required.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by applying deletion rules consistently across systems and keeping evidence that deletion occurs as required.`,
    },

    "A.8.11.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement data masking for use cases such as reports, support tools, and testing, so only the minimum necessary data is visible.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should expand masking coverage to all relevant systems and ensure masking rules are consistently applied and reviewed.`,
    },
    "A.8.11.Q2": {
      NOT_COMPLIANT:
        `${orgName} should protect sensitive data with encryption in storage and in transfer, even when masked, and manage encryption keys securely with restricted access.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by standardizing encryption requirements, improving key management controls, and verifying encryption is consistently implemented.`,
    },

    "A.8.12.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement controls to reduce leakage risk, such as labeling/classification, restrictions on external sharing, monitoring, and data loss prevention (DLP) rules where appropriate.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by tuning controls to high-risk channels, reviewing alerts/incidents regularly, and closing gaps found in repeated leakage events.`,
    },

    "A.8.13.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement backups for critical systems and data, protect backups from unauthorized access and ransomware, and regularly test restoration.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by ensuring backup coverage is complete, restoration tests are performed and documented, and failures are tracked to resolution.`,
    },
    "A.8.13.Q2": {
      NOT_COMPLIANT:
        `${orgName} should define backup frequency and retention based on business impact and data criticality, and ensure backups meet those targets.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should validate that backup frequency matches current needs and update schedules when systems or business requirements change.`,
    },

    "A.8.14.Q1": {
      NOT_COMPLIANT:
        `${orgName} should identify critical services and implement resilience measures (redundant components, failover, alternate processing) where needed to meet continuity requirements.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by testing failover and documenting results, and ensuring redundancy covers the true critical path including supplier dependencies.`,
    },

    "A.8.15.Q1": {
      NOT_COMPLIANT:
        `${orgName} should enable logging for critical systems and security events, restrict access to logs, protect logs from alteration, and define retention and review responsibilities.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by increasing log coverage, centralizing logs where feasible, and ensuring log reviews occur with documented follow-up actions.`,
    },

    "A.8.16.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement monitoring for suspicious activity (authentication anomalies, privilege use, critical changes) and define alerting and response procedures.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by improving alert quality, ensuring timely triage, and tracking investigations to closure.`,
    },
    "A.8.16.Q2": {
      NOT_COMPLIANT:
        `${orgName} should regularly review access logs and access permissions for critical systems to detect unusual access and remove unnecessary privileges.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency and ensure reviews produce actions with evidence of completion.`,
    },

    "A.8.17.Q1": {
      NOT_COMPLIANT:
        `${orgName} should synchronize system clocks to a trusted common time source (for example network time protocol (NTP)) so logs are reliable for investigation and audit.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by ensuring synchronization covers all critical systems and is monitored for drift with timely correction.`,
    },
    "A.8.17.Q2": {
      NOT_COMPLIANT:
        `${orgName} should explicitly require accurate time for logging and investigations, and ensure systems used for logging and monitoring maintain time accuracy.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by documenting requirements, auditing time synchronization periodically, and correcting gaps.`,
    },

    "A.8.18.Q1": {
      NOT_COMPLIANT:
        `${orgName} should restrict high-risk administrative tools to authorized administrators only, require approvals for use where appropriate, and log and review usage.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by reviewing tool access regularly, monitoring usage consistently, and removing unnecessary tools or access.`,
    },

    "A.8.19.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement controlled software installation procedures for production systems, including approvals, testing, licensing checks, and change records.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by enforcing procedures consistently, keeping evidence of approvals/testing, and periodically auditing installed software for unauthorized items.`,
    },

    "A.8.20.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement network security controls such as firewalls, secure configuration, segmentation where needed, and monitoring, with clear ownership and change control.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by standardizing configurations, tightening rules for sensitive segments, and reviewing network changes and logs regularly.`,
    },

    "A.8.21.Q1": {
      NOT_COMPLIANT:
        `${orgName} should secure network services (such as name resolution, remote access, wireless) with strong authentication, secure configuration, and monitoring appropriate to risk.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by improving monitoring coverage and periodically reviewing service configurations and access controls.`,
    },

    "A.8.22.Q1": {
      NOT_COMPLIANT:
        `${orgName} should segment networks based on risk (for example separating user devices, servers, and sensitive systems) and restrict traffic between segments to necessary flows only.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by reducing overly broad access between segments, documenting segmentation design, and reviewing segmentation effectiveness periodically.`,
    },

    "A.8.23.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement controls to reduce web-borne threats, such as web content filtering, malicious site blocking, and safe browsing protections.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by tuning filtering policies, reviewing alerts, and ensuring coverage for remote users and unmanaged browsing paths.`,
    },

    "A.8.24.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define when encryption is required (in storage and in transfer), implement it for sensitive information, and manage encryption keys securely with restricted access and backup procedures.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by ensuring encryption is consistently applied across systems and suppliers and by strengthening key management practices.`,
    },

    "A.8.25.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement secure development practices across the software development life cycle, including security requirements, secure design, code review, security testing, and controlled deployment.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should standardize practices across all teams and projects, keep evidence (reviews/tests), and ensure exceptions are approved and tracked.`,
    },

    "A.8.26.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define security requirements for applications before build or purchase (data protection, access control, logging, retention, supplier assurances) and include them in project and procurement decisions.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by using a consistent requirement template and verifying requirements are implemented and tested before release.`,
    },

    "A.8.27.Q1": {
      NOT_COMPLIANT:
        `${orgName} should define and apply secure architecture principles (least privilege, defense in depth, secure defaults, segregation, and logging) and review designs for high-risk systems before implementation.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve consistency by using repeatable architecture reviews and tracking design issues to resolution.`,
    },

    "A.8.28.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement secure coding standards, developer training, code review requirements, and use automated checks where feasible to reduce common vulnerabilities.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by expanding coverage to all repositories, improving review quality, and tracking recurring defect patterns to training and standard updates.`,
    },

    "A.8.29.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement pre-release security testing proportional to risk (static code analysis, dependency checks, and penetration testing where appropriate) and require remediation of high-risk findings before release.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by ensuring testing is consistent for all releases, results are documented, and fixes are tracked to closure with verification.`,
    },
    "A.8.29.Q2": {
      NOT_COMPLIANT:
        `${orgName} should avoid using production data in testing; use anonymized or synthetic data where possible, and if production data must be used, apply strict access control, encryption, and time-limited retention with approval and logging.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by enforcing a repeatable approval process, improving anonymization, and auditing test environments for unauthorized sensitive data exposure.`,
    },

    "A.8.30.Q1": {
      NOT_COMPLIANT:
        `${orgName} should require outsourced development suppliers to meet defined security requirements through contracts (including confidentiality and secure development obligations), perform supplier risk assessment, and implement oversight such as code review, security testing, and access controls.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by standardizing supplier requirements and oversight, tracking remediation actions, and re-assessing suppliers periodically or after major changes.`,
    },

    "A.8.31.Q1": {
      NOT_COMPLIANT:
        `${orgName} should separate development, testing, and production environments, restrict access appropriately, and prevent uncontrolled movement of code/data between environments.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by tightening access, improving change controls between environments, and auditing for improper access or data movement.`,
    },

    "A.8.32.Q1": {
      NOT_COMPLIANT:
        `${orgName} should implement formal change management requiring documented changes, risk assessment, testing, approval, and rollback planning for production changes.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by making approvals/testing consistent, keeping evidence for every change, and analyzing repeated change-related incidents to improve the process.`,
    },

    "A.8.33.Q1": {
      NOT_COMPLIANT:
        `${orgName} should secure test data by limiting access, using anonymized or synthetic data where possible, encrypting sensitive data, and deleting test data when no longer needed.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should strengthen by auditing test environments for sensitive data exposure and enforcing consistent data handling rules and retention limits.`,
    },

    "A.8.34.Q1": {
      NOT_COMPLIANT:
        `${orgName} should plan and control audit testing to avoid disruption, including approval for testing scope, defined windows, monitoring during testing, and clear escalation/stop conditions if risk arises.`,
      PARTIALLY_COMPLIANT:
        `${orgName} should improve by standardizing audit testing procedures, documenting approvals and outcomes, and ensuring lessons learned are applied to future testing.`,
    },
  };

  const canonicalId = canonicalizeRuleKey(controlId);
  const lookupId = aliasMandatoryQuestionId(canonicalId);

  // Prefer exact match (including per-question keys), then fall back to base control keys.
  const baseId = String(lookupId || "")
    .trim()
    .replace(/\.Q\d+$/i, "");

  const controlRules =
    rules[lookupId] ||
    rules[canonicalId] ||
    (baseId && rules[baseId]) ||
    (canonicalId ? rules[String(canonicalId).replace(/\.Q\d+$/i, "")] : null) ||
    rules[controlId];

  // If a specific rule exists, use it.
  // Treat empty-string rules as “no recommendation” (used for applicability-only questions).
  if (controlRules && Object.prototype.hasOwnProperty.call(controlRules, complianceState)) {
    const text = interpolateOrgName(controlRules[complianceState]);
    if (text == null) return null;
    const s = String(text);
    if (!s.trim()) return null;
    return s;
  }

  // Generic fallback so new/updated controls still get actionable guidance.
  if (complianceState === "NOT_COMPLIANT") {
    return interpolateOrgName(
      `Implement and document controls for ${controlId} to meet ISO/IEC 27001 requirements.`
    );
  }

  if (complianceState === "PARTIALLY_COMPLIANT") {
    return interpolateOrgName(
      `Strengthen and formalize your implementation of ${controlId} (document the process, assign ownership, and review effectiveness regularly).`
    );
  }

  return null;
}
