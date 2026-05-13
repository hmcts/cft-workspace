---
title: Drools Rules
topic: drools
diataxis: explanation
product: am
audience: both
sources:
  - am-role-assignment-service:src/main/resources/validationrules/core/role-assignment-config-validation.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/reject-unapproved-role-assignments.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/organisational-role-mapping-common.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/case-allocator-global.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/load-case-data.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/specific-access-global.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/challenged-access-global.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/conflict-of-interest-global.drl
  - am-role-assignment-service:src/main/resources/META-INF/kmodule.xml
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/config/DroolConfig.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/common/ValidationModelService.java
  - am-role-assignment-service:src/main/resources/application.yaml
  - am-org-role-mapping-service:src/main/resources/META-INF/kmodule.xml
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/DroolConfig.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java
  - am-org-role-mapping-service:src/main/resources/validationrules/core/core.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/core/log.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/core/hearing-role-judicial-global.drl
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/organisational-role-mapping-common.drl
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/reject-unapproved-role-assignments.drl
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/role-assignment-config-validation.drl
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/load-case-data.drl
  - apps/am/am-role-assignment-service/src/main/resources/META-INF/kmodule.xml
  - apps/am/am-org-role-mapping-service/src/main/resources/META-INF/kmodule.xml
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/core/core.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-caseworker-mapping.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
  - apps/am/am-role-assignment-service/src/main/resources/roleconfig/role_common.json
confluence:
  - id: "1440494617"
    title: "Validation Rules by Drools Engine"
    last_modified: "unknown"
    space: "AM"
  - id: "1385792545"
    title: "LLD - Role Assignment Service"
    last_modified: "unknown"
    space: "AM"
  - id: "1411088955"
    title: "LLD - Organisation Role Mapping Service"
    last_modified: "unknown"
    space: "AM"
  - id: "1491643419"
    title: "HLD - Role Assignment Service - v1.3"
    last_modified: "unknown"
    space: "AM"
  - id: "1593576197"
    title: "AM applications feature flags"
    last_modified: "unknown"
    space: "AM"
  - id: "1386808483"
    title: "POST /am/role-assignments"
    last_modified: "unknown"
    space: "AM"
confluence_checked_at: "2026-05-13T12:00:00Z"
---

## TL;DR

- Both RAS and ORM embed in-process Drools engines using `StatelessKieSession` — no state persists between requests; all facts are inserted fresh each time.
- **RAS** uses Drools for _validation_ — deciding whether an incoming role assignment request should be approved or rejected based on the caller identity and assignment attributes. This applies to both create and delete operations.
- **ORM** uses Drools for _mapping_ — deriving which organisational role assignments a user should hold, based on their CRD/JRD profile data.
- Rules are `.drl` files on the classpath, organised by jurisdiction. Both services define a `kmodule.xml` declaring a single `KieBase` and `KieSession`.
- Feature flags (`FeatureFlag` facts) gate individual rules and are loaded from a `flag_config` Postgres table, not LaunchDarkly. A separate set of LaunchDarkly flags controls service-level toggles (e.g. refresh APIs, JBS endpoints).
- RAS additionally validates approved assignments against a JSON role-config pattern catalogue before final persistence.
- A `byPassOrgDroolRule` environment variable (`BYPASS_ORG_DROOL_RULE`) allows non-ORM services to create organisational roles in lower environments for testing — this is always `false` in production.

## Purpose of Drools in Each Service

### RAS: Validation Rules

The Role Assignment Service uses Drools to answer a single question per request: _"Is this caller allowed to create/delete this role assignment?"_ The engine does not derive new roles — it validates that an incoming `AssignmentRequest` is authorised. The RAS is an instantiation of the **Rule Validated Microservice Pattern**, which defines generic data models and processes for a microservice with rule-driven validation of resource creation and deletion.
<!-- CONFLUENCE-ONLY: "Rule Validated Microservice Pattern" as an architectural pattern name — not verified in source -->

#### Create flow (two-stage)

1. **Stage 1 — Service-trust approval**: A jurisdiction or service-specific rule matches the `Request.clientId` (from the S2S token) and the `RoleAssignment` attributes, then sets status from `CREATE_REQUESTED` to `CREATE_APPROVED`. Example: the ORM trusted rule at `organisational-role-mapping-common.drl:19-41` auto-approves any request from `am_org_role_mapping_service` to create ORGANISATION roles.

2. **Stage 2 — Pattern validation**: The `validate_role_assignment_against_patterns` rule (`role-assignment-config-validation.drl:44-62`) matches any `CREATE_APPROVED` assignment against the JSON role-config patterns and, if valid, promotes the status to `APPROVED`.

If no rule approves a role assignment, a fallback rule at `salience -1000` (`reject-unapproved-role-assignments.drl:11`) sets the status to `REJECTED`.

#### Delete flow

Deletion follows the same pattern: a rule must match to promote a role assignment from `DELETE_REQUESTED` to `DELETE_APPROVED`. A separate fallback rule at `salience -1000` sets unapproved deletions to `DELETE_REJECTED`. The ORM trusted rule also handles `DELETE_REQUESTED` for organisational roles. Pattern validation (stage 2) does not apply to deletions.

#### Identity model for validation

Validation rules can inspect four distinct identity values on each request:

| Identity | Source | Description |
|----------|--------|-------------|
| `clientId` | S2S `serviceAuthorization` token | The calling microservice |
| `authenticatedUserId` | IDAM `Authorization` token | The user account submitting the request |
| `assignerId` | Request body (`roleRequest.assignerId`) | The user authorising the assignment (may differ from authenticated user in async flows) |
| `actorId` | Each `RoleAssignment` record | The user receiving the role |

Rules commonly check that `assignerId == authenticatedUserId` for user-initiated flows, and relax this for system/async flows (e.g. ORM, workflow engines).

### ORM: Mapping Rules

The Org Role Mapping Service uses Drools to answer a different question: _"Given this user's reference data profile, what organisational roles should they hold?"_ The engine derives a set of `RoleAssignment` facts that ORM then sends to RAS for persistence.

For caseworker users this is a single-stage process. For judicial users it is two-stage:

1. **Stage 1 — Office holder derivation**: Rules match a `JudicialAccessProfile` (from JRD) and `insert` a `JudicialOfficeHolder` with a jurisdiction-specific `office` string (e.g. `"CIVIL Circuit Judge-Salaried"`). Defined in `{jur}-judicial-office-holder-mapping.drl` files.

2. **Stage 2 — Role assignment creation**: Rules match the `JudicialOfficeHolder.office` (and optionally a `JudicialBooking` for fee-paid judges) and `insert` a `RoleAssignment`. Defined in `{jur}-judicial-org-role-mapping.drl` files.

## Rule File Structure

### Directory layout

Both services follow a similar layout under `src/main/resources/`:

**ORM directories** (10 jurisdictions):
```
validationrules/
  core/           # shared queries, logging, hearing role globals
  iac/            # Immigration & Asylum Chamber
  sscs/           # SSCS
  civil/          # Civil
  privatelaw/     # Private Law (Family)
  publiclaw/      # Public Law (Family)
  employment/     # Employment Tribunals
  stcic/          # Special Tribunals / CIC
  hrs/            # Hearing Recording Service
  probate/        # Probate
```

**RAS directories** (37 `.drl` files across 17 packages):
```
validationrules/
  core/           # shared rules (ORM trust, pattern validation, rejection, case data, specific/challenged/excluded access)
  iac/            # IAC case-role validation (legal-ops, judicial, system-user)
  iac/common/     # IAC shared rules (specific access, case-role)
  sscs/           # SSCS case-role validation
  sscs/common/    # SSCS shared case-role rules
  civil/          # Civil case-role validation
  civil/common/   # Civil shared rules (specific access)
  privatelaw/     # Private Law case-role validation
  publiclaw/      # Public Law case-role validation
  employment/     # Employment case-role validation
  stcic/          # Special Tribunals case-role validation
  probate/        # Probate case-role validation
  possessions/    # Possessions case-role validation (in development)
  ccd/            # CCD service-trust rules
  prm/            # Professional role mapping validation
  wa/             # WA test jurisdiction bypass (lower envs only)
  test/           # Test rules
  dev/            # Development superuser bypass — NOT loaded in production
```

Note: The `dev/` package is excluded from `kmodule.xml`. The `wa/` and `test/` packages are loaded but gated by feature flags that are always `false` in production.

### ORM rule file naming convention

Each jurisdiction directory in ORM follows a consistent pattern:

| File | Purpose |
|------|---------|
| `{jur}-caseworker-mapping.drl` | Staff caseworker role derivation |
| `{jur}-admin-mapping.drl` | Admin role derivation |
| `{jur}-ctsc-mapping.drl` | CTSC role derivation |
| `{jur}-other-mapping.drl` | OTHER_GOV_DEPT role derivation (where applicable) |
| `{jur}-judicial-office-holder-mapping.drl` | Stage 1: profile to office holder |
| `{jur}-judicial-org-role-mapping.drl` | Stage 2: office holder to role assignment |
| `{jur}-multi-region.drl` | Multi-region cloning (where required) |

### ORM core global rules

Beyond jurisdiction-specific rules, ORM's `core/` package contains:

| File | Purpose |
|------|---------|
| `core.drl` | Named queries: `getRoleAssignments()` and `getJudicialOfficeHolders()` |
| `log.drl` | Diagnostic rules at `salience 1000` that log all inserted facts; also a `salience -1000` rule that logs rejected `JudicialAccessProfile` facts (those with `status == null`) |
| `hearing-role-judicial-global.drl` | Global hearing-viewer/hearing-judge org roles for judicial users across all jurisdictions |
| `hearing-role-caseworker-global.drl` | Global hearing roles for caseworkers |
| `hearing-role-admin-global.drl` | Global hearing roles for admin users |
| `hearing-role-ctsc-global.drl` | Global hearing roles for CTSC users |
| `hearing-role-other-global.drl` | Global hearing roles for OTHER_GOV_DEPT users |

The hearing role globals allow new services to be on-boarded by simply including their jurisdiction in the condition (e.g. checking `$joh.jurisdiction in ("PUBLICLAW", "CIVIL", ...)`), without needing separate hearing-role files per jurisdiction.

## How Rules Are Loaded

Both services use the same mechanism:

1. A `META-INF/kmodule.xml` on the classpath declares a `KieBase` with an explicit package list and a named `KieSession`.
2. A Spring `@Configuration` class (`DroolConfig.java`) creates a `KieContainer` from the classpath resources, obtains the `KieBase`, and builds a `StatelessKieSession` bean.
3. At request time, the orchestrator inserts facts into the session and calls `execute(...)`.

**RAS kmodule.xml** (`am-role-assignment-service:src/main/resources/META-INF/kmodule.xml`):
- KieBase name: `role-assignment-validation`
- Session name: `role-assignment-validation-session`
- Packages listed explicitly:
  ```
  validationrules.test, validationrules.core,
  validationrules.iac, validationrules.ccd, validationrules.iac.common,
  validationrules.wa, validationrules.sscs, validationrules.sscs.common,
  validationrules.civil.common, validationrules.civil,
  validationrules.privatelaw, validationrules.publiclaw,
  validationrules.employment, validationrules.stcic,
  validationrules.probate, validationrules.possessions
  ```
- The `validationrules.dev` and `validationrules.prm` packages are NOT included in kmodule.xml, so the dev superuser bypass and PRM rules are inactive.

**ORM kmodule.xml** (`am-org-role-mapping-service:src/main/resources/META-INF/kmodule.xml`):
- KieBase name: `org-role-mapping-validation`
- Session name: `org-role-mapping-validation-session`
- Packages:
  ```
  validationrules.core, validationrules.iac, validationrules.sscs,
  validationrules.civil, validationrules.privatelaw, validationrules.publiclaw,
  validationrules.employment, validationrules.stcic, validationrules.hrs,
  validationrules.probate
  ```

## Facts Inserted Into Working Memory

### RAS facts (`ValidationModelService.java:132-176`)

| Fact type | Source | Purpose |
|-----------|--------|---------|
| `Request` | The incoming request wrapper | Drools matches `clientId`, `requestType` |
| `RoleAssignment` | Each requested role in the request | The object whose `status` gets set |
| `ExistingRoleAssignment` | Fetched from DB for assigner, authenticated user, all assignees | Used to verify the assigner holds a qualifying role |
| `RoleConfig` | Singleton loaded from JSON at startup | Pattern validation in stage 2 |
| `FeatureFlag` | One per `FeatureFlagEnum` value, read from `flag_config` table | Gates rules on/off |
| `Case` (lazy) | Loaded via `DATA_SERVICE.getCaseById()` when a rule fires `load-case-data.drl` | Provides case metadata for case-role validation |

### ORM facts (`RequestMappingService.java:186-214`)

| Fact type | Source | Purpose |
|-----------|--------|---------|
| `CaseWorkerAccessProfile` | Flattened from CRD `CaseWorkerProfile` (one per role x workArea) | Input for caseworker rules |
| `JudicialAccessProfile` | Flattened from JRD `JudicialProfileV2` (one per appointment x serviceCode) | Input for judicial stage 1 |
| `JudicialBooking` | Fetched from JBS for the user | Required by fee-paid judicial rules |
| `FeatureFlag` | From `flag_config` table | Gates rules on/off |

ORM extracts results using a named Drools query `getRoleAssignments` defined in `core.drl:7-9`, which collects all `RoleAssignment` facts from working memory after `fireAllRules()`.

## Feature Flag Pattern

Every rule begins with a feature-flag guard:

```drl
rule "civil_circuit_judge_salaried_joh"
when
    $f: FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_0.getValue())
    $jap: JudicialAccessProfile(appointment == "Circuit Judge", ...)
then
    insert(new JudicialOfficeHolder(...));
end
```

Obsolete rules are disabled by adding a _negative_ flag condition rather than deleting the rule file:

```drl
rule "obsolete_rule_name"
when
    $f: FeatureFlag(status == false, flagName == FeatureFlagEnum.SOME_OLD_FLAG.getValue())
    ...
```

Flags are stored in the `flag_config` Postgres table (per-environment rows). Adding a new flag requires a Flyway migration to insert the rows and a corresponding entry in the `FeatureFlagEnum` Java enum. In non-prod environments, flags are read from DB on every request; in prod they are cached in a static `ConcurrentHashMap` to avoid repeated DB hits (`ValidationModelService.java:148-163`, `RequestMappingService.java:221-239`).

### Flag naming convention

DB flags follow a consistent naming pattern: `{jurisdiction}_{feature}_{major}_{minor}`, for example:
- `iac_1_1` — IAC WA release 2 (staff + judicial roles)
- `civil_wa_1_0` — Civil WA release 1
- `sscs_hearing_1_0` — SSCS hearing org roles
- `publiclaw_wa_2_2` — Public Law WA release 2.2
- `disposer_1_0` — Case disposer support

As of the latest Confluence flag registry, RAS has ~15 DB flags and ORM has ~55+ DB flags. New jurisdictions are on-boarded by adding new flags and their corresponding `.drl` rules files.

### LaunchDarkly vs DB flags

| Flag type | Used for | Service |
|-----------|----------|---------|
| DB (`flag_config`) | Gating individual Drools rules on/off per environment | RAS, ORM |
| LaunchDarkly | Service-level API toggles (refresh endpoints, JBS APIs, delete-by-query) | RAS, ORM, JBS |

The `get-db-drools-flag` LD flag is a test utility that exposes an API endpoint in lower environments to query DB flag status, enabling FTA scenarios to verify flag state programmatically.

## Bypass Mechanism for Lower Environments

<!-- REVIEW: BYPASS_ORG_DROOL_RULE defaults to false in application.yaml:181 (${BYPASS_ORG_DROOL_RULE:false}), not true. Lower envs override to true via Helm values (values.aat.template.yaml:12, values.preview.template.yaml:33). -->
RAS exposes an environment variable `BYPASS_ORG_DROOL_RULE` (default `true` in `application.yaml`, overridden to `false` in production via `values.prod.template.yaml`). When `true`, the `Request.byPassOrgDroolRule` flag is set by `ParseRequestService`, and the ORM trust rule's condition becomes:

```drl
$rq: Request(byPassOrgDroolRule || clientId == "am_org_role_mapping_service")
```

This allows **any** service to create organisational roles in preview, AAT, demo, perftest, and ITHC environments, enabling functional test automation (FTA) without requiring the ORM service to be involved. In production, only `am_org_role_mapping_service` (i.e. the real ORM) can create organisational roles.

Similarly, the `ccd_bypass_1_0` and `wa_bypass_1_0` DB feature flags enable test-jurisdiction case roles in lower environments. These are always `false` in production and ITHC.

## Example Rule Patterns

### ORM: Caseworker mapping (single-stage)

<!-- REVIEW: This simplified example does not match source. The real rule uses FeatureFlagEnum.CIVIL_WA_1_4 (not CIVIL_WA_1_0), roleId=="1" (not "4"), serviceCode in ("AAA6","AAA7") (not == "AAA6"), and uses RoleAssignment.builder() pattern not new RoleAssignment(). See am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-caseworker-mapping.drl:22-45 -->
```drl
rule "v1_4_civil_senior_tribunal_caseworker_org_role"
when
    $f: FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_0.getValue())
    $cap: CaseWorkerAccessProfile(
        roleId == "4", serviceCode == "AAA6", !suspended
    )
then
    RoleAssignment ra = new RoleAssignment();
    ra.setActorId($cap.getId());
    ra.setRoleType(RoleType.ORGANISATION);
    ra.setRoleName("senior-tribunal-caseworker");
    ra.setGrantType(GrantType.STANDARD);
    ra.setClassification(Classification.PUBLIC);
    ra.setRoleCategory(RoleCategory.LEGAL_OPERATIONS);
    // ... set attributes (jurisdiction, primaryLocation, region, workTypes)
    insert(ra);
end
```

(`civil-caseworker-mapping.drl:22-45`)

### ORM: Judicial fee-paid role (requires booking)

Fee-paid judicial roles require a `JudicialBooking` fact to provide location and time boundaries:

```drl
rule "civil_fee_paid_judge_org_role"
when
    $f: FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_0.getValue())
    $joh: JudicialOfficeHolder(office == "CIVIL Fee-Paid Judge")
    $bk: JudicialBooking(userId == $joh.userId)
then
    RoleAssignment ra = new RoleAssignment();
    ra.setActorId($joh.getUserId());
    ra.setBeginTime($bk.getBeginTime());
    ra.setEndTime($bk.getEndTime());
    // ... attributes include $bk.locationId, $bk.regionId
    insert(ra);
end
```

(`civil-judicial-org-role-mapping.drl:100-135`)

### RAS: ORM trusted service rule

```drl
rule "staff_organisational_role_mapping_service_create"
when
    $rq: Request(byPassOrgDroolRule || clientId == "am_org_role_mapping_service")
    $ra: RoleAssignment(
        status == Status.CREATE_REQUESTED,
        roleType == RoleType.ORGANISATION,
        roleCategory in (RoleCategory.LEGAL_OPERATIONS, RoleCategory.JUDICIAL,
                         RoleCategory.ADMIN, RoleCategory.OTHER_GOV_DEPT, RoleCategory.CTSC)
    )
then
    $ra.setStatus(Status.CREATE_APPROVED);
    $ra.log("Create approved : staff_organisational_role_mapping_service_create");
    update($ra);
    logMsg("Rule : staff_organisational_role_mapping_service_create");
end;
```

(`organisational-role-mapping-common.drl:19-41`)

Note: The same file also contains `staff_organisational_role_mapping_service_delete` (for `DELETE_REQUESTED`) and service-specific system-user rules for SSCS (`sscs_system_user_hearings_roles_create`) and Public Law (`public_law_system_user_case_allocator_role_create`) that bypass ORM for specific `RoleCategory.SYSTEM` roles.

### RAS: Case-allocator approval

```drl
rule "case_allocator_approve_specific_access"
when
    $rq: Request(clientId in ("xui_webapp", "wa_task_management_api"))
    $ra: RoleAssignment(status == Status.CREATE_REQUESTED, grantType == GrantType.SPECIFIC, ...)
    $existing: ExistingRoleAssignment(
        actorId == $rq.assignerId, roleName == "case-allocator",
        attributes["jurisdiction"] == $ra.attributes["jurisdiction"]
    )
then
    $ra.setStatus(Status.CREATE_APPROVED);
end
```

(`case-allocator-global.drl:18-79` — simplified)

### RAS: Specific access rules

The `specific-access-global.drl` file handles the "specific access" workflow, which involves multiple role transitions:

1. **Self-request**: A user creates a `specific-access-requested` case role for themselves. The rule requires the user to hold an existing org role in the relevant `roleCategory`, and the `notes` field must contain non-empty justification text.

2. **Approval/Denial**: An approver (via `xui_webapp`) creates a `specific-access-granted` or `specific-access-denied` case role for the requester. The rule checks the requester already holds a `specific-access-requested` role with matching `requestedRole` attribute.

3. **Approver-granted case role**: A `specific-access-approver-*` role holder creates a jurisdiction-scoped specific access role (e.g. `specific-access-admin`, `specific-access-judiciary`, `specific-access-legal-ops`, `specific-access-ctsc`). The rule verifies the approver's org role matches the request category and jurisdiction, and that their classification level meets or exceeds the case's security classification.

The `reference` field for specific access requests uses a composite format: `{caseId}/{requestedRole}/{actorId}`.

### RAS: Rule categories summary

RAS core rules span several functional areas:

| Rule file | Category |
|-----------|----------|
| `organisational-role-mapping-common.drl` | ORM/system service trust (create + delete) |
| `case-allocator-global.drl` | Case allocator approval for specific-access grants |
| `specific-access-global.drl` | Specific access request/approve/deny lifecycle |
| `challenged-access-global.drl` | Challenged access case role creation |
| `conflict-of-interest-global.drl` | Excluded (conflict of interest) role creation |
| `load-case-data.drl` | Lazy loading of CCD case data into working memory |
| `role-assignment-config-validation.drl` | Stage 2 pattern validation |
| `reject-unapproved-role-assignments.drl` | Fallback rejection (salience -1000) |

## Role Config JSON (RAS Stage 2)

After a rule sets status to `CREATE_APPROVED`, the structural validation rule matches the assignment against a JSON pattern catalogue. These are loaded at startup from `src/main/resources/roleconfig/role_*.json` files.

Each JSON file is an array of role objects:

<!-- REVIEW: This example has three errors vs real source (role_common.json): (1) classification values are only ["PUBLIC","PRIVATE"] not ["PUBLIC","PRIVATE","RESTRICTED"]; (2) substantive should be false not true; (3) attributes only has "jurisdiction" as mandatory, not "primaryLocation". See am-role-assignment-service:src/main/resources/roleconfig/role_common.json -->
```json
[
  {
    "name": "case-allocator",
    "label": "Case Allocator",
    "category": "JUDICIAL",
    "type": "ORGANISATION",
    "substantive": true,
    "patterns": [
      {
        "roleType": { "mandatory": true, "values": ["ORGANISATION"] },
        "grantType": { "mandatory": true, "values": ["STANDARD"] },
        "classification": { "mandatory": true, "values": ["PUBLIC","PRIVATE","RESTRICTED"] },
        "attributes": {
          "jurisdiction": { "mandatory": true },
          "primaryLocation": { "mandatory": true }
        }
      }
    ]
  }
]
```

The `validate_role_assignment_against_patterns` rule loads matching `RoleConfigPattern` facts and checks that the assignment's attributes satisfy all mandatory constraints. On match, it promotes status to `APPROVED` and sets the `substantive` attribute (`role-assignment-config-validation.drl:44-62`).

Role lookup uses a composite key of `(roleName, roleCategory, roleType)` — the same role name in different categories has separate pattern sets (`RoleConfig.java:28`).

## Key Differences Between RAS and ORM Drools Usage

| Aspect | RAS (Validation) | ORM (Mapping) |
|--------|-------------------|----------------|
| Purpose | Approve or reject incoming requests | Derive role assignments from profiles |
| Input facts | `Request`, `RoleAssignment`, `ExistingRoleAssignment`, `RoleConfig` | `CaseWorkerAccessProfile`, `JudicialAccessProfile`, `JudicialBooking` |
| Output | Status mutation on existing facts (`APPROVED` / `REJECTED`) | New `RoleAssignment` facts inserted into working memory |
| Result extraction | Status field on the passed-in objects | Named query `getRoleAssignments` collects inserted facts |
| Stage 2 | JSON pattern validation | N/A (ORM sends to RAS which does its own validation) |
| Session type | `StatelessKieSession` | `StatelessKieSession` |
| Fallback | Rejection at `salience -1000` | No fallback — absent rules simply mean no roles derived |

## Important Distinctions

- **`RoleAssignment` vs `ExistingRoleAssignment`**: In RAS, these are distinct Java types. `RoleAssignment` represents the _requested_ assignment; `ExistingRoleAssignment` represents roles already in the database. Drools pattern matching uses the type to distinguish them — a rule checking "does the assigner already hold role X" matches on `ExistingRoleAssignment`.

- **Lazy case-data loading**: RAS loads case data from CCD only when needed. The `load_case_data_for_role_assignments_with_case_ids` rule (`load-case-data.drl:21`) fires when a `RoleAssignment` has a `caseId` attribute and no `Case` fact is yet in working memory. It calls a `DATA_SERVICE` global injected at `ValidationModelService.java:169`. Requests from `ccd_data`, `aac_manage_case_assignment`, `ccd_case_disposer`, or `disposer-idam-user` skip this loading.

- **Multi-region cloning**: Some ORM judicial roles require one assignment per region. The rule calls `cloneNewRoleAssignmentAndChangeRegion(ra, regionId)` in a loop for regions 1-7 (`civil-judicial-org-role-mapping.drl:283-292`).

- **`endTime` +1 day**: Salaried judicial roles in ORM set `endTime` to `$joh.getEndTime().plusDays(1)` — an intentional offset to avoid premature expiry on the last day of appointment.

## Refreshing Roles After Rule Changes

When Drools mapping rules are changed (e.g. adding a new role for a jurisdiction), existing users' organisational roles need to be re-derived. This is handled by the **refresh** mechanism:

1. A row is inserted into ORM's `refresh_jobs` table with `status = NEW`, specifying `role_category` (e.g. `LEGAL_OPERATIONS`) and `jurisdiction` (e.g. `CIVIL` or `ALL`).
2. The `am-role-assignment-refresh-batch` Kubernetes CronJob picks up `NEW` jobs and calls ORM's refresh API (`POST /am/role-mapping/refresh`).
3. ORM fetches all affected user profiles from CRD/JRD (paginated), re-runs the Drools mapping rules, and sends the resulting role assignments to RAS with `replaceExisting = true`.
4. On completion, the job status is updated to `COMPLETE`. Partial failures update status to `ABORTED` with failed user IDs stored for retry in a linked job.
<!-- CONFLUENCE-ONLY: refresh_jobs table schema and retry semantics — not verified in source -->

The refresh batch is scheduled via CNP flux configuration (`cnp-flux-config >> apps >> am >> am-role-assignment-refresh-batch >> prod.yaml`). The `REFRESH_JOB` environment variable in ORM's flux config controls which job runs (e.g. `LEGAL_OPERATIONS-CIVIL-NEW-0-1`).

## ORM ASB Message Processing

ORM subscribes to Azure Service Bus topics for CRD and JRD change events using PEEKLOCK mode. Messages are retried up to 4 times with a 5-minute lock duration between attempts (giving a 15-minute window for transient issues). After 4 failed attempts, messages move to the dead letter queue for manual recovery.
<!-- CONFLUENCE-ONLY: ASB retry count (4) and lock duration (5 min) — not verified in source -->

## Examples

### RAS kmodule.xml — KieBase package registration

```xml
// Source: apps/am/am-role-assignment-service/src/main/resources/META-INF/kmodule.xml
<?xml version="1.0" encoding="UTF-8"?>
<kmodule xmlns="http://jboss.org/kie/6.0.0/kmodule">
  <kbase name="role-assignment-validation"
         packages="validationrules.test,
                  validationrules.core,
                  validationrules.iac,
                  validationrules.ccd,
                  validationrules.iac.common,
                  validationrules.wa,
                  validationrules.sscs,
                  validationrules.sscs.common,
                  validationrules.civil.common,
                  validationrules.civil,
                  validationrules.privatelaw,
                  validationrules.publiclaw,
                  validationrules.employment,
                  validationrules.stcic,
                  validationrules.probate,
                  validationrules.possessions">
      <ksession name="role-assignment-validation-session" type="stateless"/>
  </kbase>
</kmodule>
```

### ORM kmodule.xml — KieBase package registration

```xml
// Source: apps/am/am-org-role-mapping-service/src/main/resources/META-INF/kmodule.xml
<?xml version="1.0" encoding="UTF-8"?>
<kmodule xmlns="http://jboss.org/kie/6.0.0/kmodule">
    <kbase name="org-role-mapping-validation"
           packages="validationrules.core,
                    validationrules.iac,
                    validationrules.sscs,
                    validationrules.civil,
                    validationrules.privatelaw,
                    validationrules.publiclaw,
                    validationrules.employment,
                    validationrules.stcic,
                    validationrules.hrs,
                    validationrules.probate">
        <ksession name="org-role-mapping-validation-session" type="stateless"/>
    </kbase>
</kmodule>
```

### ORM core.drl — named queries that extract results from working memory

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/core/core.drl
package validationrules.core;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.RoleAssignment;

/*
 * Query which returns all role assignments currently in working memory.
 */
query getRoleAssignments ()
    $roleAssignment: RoleAssignment()
end;

/*
 * Query which returns all judicial office holders currently in working memory.
 */
query getJudicialOfficeHolders ()
    $judicialOfficeHolder: JudicialOfficeHolder()
end;
```

### RAS: ORM trusted service create/delete rules (actual source)

```drool
// Source: apps/am/am-role-assignment-service/src/main/resources/validationrules/core/organisational-role-mapping-common.drl
rule "staff_organisational_role_mapping_service_create"
when
    $rq: Request(byPassOrgDroolRule || clientId == "am_org_role_mapping_service")

    $ra: RoleAssignment(
             status == Status.CREATE_REQUESTED,
             roleType == RoleType.ORGANISATION,
             roleCategory in (RoleCategory.LEGAL_OPERATIONS, RoleCategory.JUDICIAL,
                              RoleCategory.ADMIN, RoleCategory.OTHER_GOV_DEPT, RoleCategory.CTSC) )
then
    $ra.setStatus(Status.CREATE_APPROVED);
    $ra.log("Create approved : staff_organisational_role_mapping_service_create");
    update($ra);
    logMsg("Rule : staff_organisational_role_mapping_service_create");
end;

rule "staff_organisational_role_mapping_service_delete"
when
    $rq: Request(byPassOrgDroolRule || clientId == "am_org_role_mapping_service")
    $ra: RoleAssignment(
             status == Status.DELETE_REQUESTED,
             roleType == RoleType.ORGANISATION,
             roleCategory in (RoleCategory.LEGAL_OPERATIONS, RoleCategory.JUDICIAL,
                              RoleCategory.ADMIN, RoleCategory.OTHER_GOV_DEPT, RoleCategory.CTSC) )
then
    $ra.setStatus(Status.DELETE_APPROVED);
    $ra.log("Delete approved : staff_organisational_role_mapping_service_delete");
    update($ra);
    logMsg("Rule :: staff_organisational_role_mapping_service_delete");
end;
```

### RAS: rejection fallback (salience -1000)

```drool
// Source: apps/am/am-role-assignment-service/src/main/resources/validationrules/core/reject-unapproved-role-assignments.drl
rule "reject_unapproved_create_role_assignments"
salience -1000
when
    $ra: RoleAssignment(status in ( Status.CREATE_REQUESTED, Status.CREATE_APPROVED))
then
    logMsg("Rule : reject_unapproved_create_role_assignments");
    $ra.setStatus(Status.REJECTED);
    $ra.log("Create not approved by any rule, hence rejected  : reject_unapproved_create_role_assignments");
    update($ra);
end;

rule "reject_unapproved_delete_role_assignments"
salience -1000
when
    $ra: RoleAssignment(status == Status.DELETE_REQUESTED)
then
    logMsg("Rule : reject_unapproved_delete_role_assignments");
    $ra.setStatus(Status.DELETE_REJECTED);
    $ra.log("Delete not approved by any rule, hence ejected  : reject_unapproved_delete_role_assignments");
    update($ra);
end;
```

### RAS: stage-2 pattern validation rules

```drool
// Source: apps/am/am-role-assignment-service/src/main/resources/validationrules/core/role-assignment-config-validation.drl
rule "load_role_config_patterns"
when
    RoleAssignment(
        status == Status.CREATE_APPROVED,
        $roleName : roleName,
        $roleCategory : roleCategory,
        $roleType : roleType)
    $rc: RoleConfig(get($roleName, $roleCategory, $roleType) != null)
then
    for (RoleConfigPattern pattern : $rc.get($roleName, $roleCategory, $roleType).getPatterns()) {
        insert(pattern);
    }
end;

rule "validate_role_assignment_against_patterns"
when
    $ra: RoleAssignment(status == Status.CREATE_APPROVED)
    $rc: RoleConfigPattern(
        roleName == $ra.roleName,
        roleCategory == $ra.roleCategory,
        roleType == null || roleType.matches($ra.roleType),
        grantType == null || grantType.matches($ra.grantType),
        classification == null || classification.matches($ra.classification),
        attributesMatch($ra.attributes))
then
    $ra.setAttribute("substantive",$rc.isSubstantive() ? "Y" : "N");
    $ra.setStatus(Status.APPROVED);
    $ra.log("Approved : validate_role_assignment_against_patterns");
    update($ra);
end;
```

### RAS: lazy case-data loading rule

```drool
// Source: apps/am/am-role-assignment-service/src/main/resources/validationrules/core/load-case-data.drl
global uk.gov.hmcts.reform.roleassignment.domain.service.common.RetrieveDataService DATA_SERVICE;

rule "load_case_data_for_role_assignments_with_case_ids"
when
    $ra: RoleAssignment(
             attributes["caseId"] != null && $caseId : attributes["caseId"].asText())
     not Case(id == $caseId)
     not Request(clientId in ("ccd_data", "aac_manage_case_assignment", "ccd_case_disposer", "disposer-idam-user"))
then
    insert(DATA_SERVICE.getCaseById($caseId));
    logMsg("Rule :load_case_data_for_role_assignments_with_case_ids");
end;
```

### ORM: caseworker mapping rule (CIVIL, real source)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-caseworker-mapping.drl
rule "v1_4_civil_senior_tribunal_caseworker_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_4.getValue())
  $cap: CaseWorkerAccessProfile(roleId == "1", serviceCode in ("AAA6", "AAA7"), !suspended)
then
   Map<String,JsonNode> attribute = new HashMap<>();
   attribute.put("jurisdiction", JacksonUtils.convertObjectIntoJsonNode("CIVIL"));
   attribute.put("primaryLocation", JacksonUtils.convertObjectIntoJsonNode($cap.getPrimaryLocationId()));
   attribute.put("workTypes", JacksonUtils.convertObjectIntoJsonNode("decision_making_work,access_requests"));
  insert(
      RoleAssignment.builder()
      .actorIdType(ActorIdType.IDAM)
      .actorId($cap.getId())
      .roleCategory(RoleCategory.LEGAL_OPERATIONS)
      .roleType(RoleType.ORGANISATION)
      .roleName("senior-tribunal-caseworker")
      .grantType(GrantType.STANDARD)
      .classification(Classification.PUBLIC)
      .readOnly(false)
      .attributes(attribute)
      .authorisations($cap.getSkillCodes())
      .build());
      logMsg("Rule : v1_4_civil_senior_tribunal_caseworker_org_role");
end;
```

### ORM: judicial office holder mapping — Stage 1 (CIVIL circuit judge, real source)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl
rule "civil_circuit_judge_salaried_joh"
when
   $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_0.getValue())
   $jap: JudicialAccessProfile(appointment == "Circuit Judge",
                               appointmentType in ("Salaried", "SPTW"),
                               (endTime == null || endTime.compareTo(ZonedDateTime.now()) >= 0),
                               (validateAuthorisation(authorisations, "AAA6") || validateAuthorisation(authorisations, "AAA7")))
then
  insert(
      JudicialOfficeHolder.builder()
      .userId($jap.getUserId())
      .office("CIVIL Circuit Judge-Salaried")
      .jurisdiction("CIVIL")
      .ticketCodes($jap.getTicketCodes())
      .beginTime($jap.getBeginTime())
      .endTime($jap.getEndTime())
      .regionId($jap.getRegionId())
      .baseLocationId($jap.getBaseLocationId())
      .primaryLocation($jap.getPrimaryLocationId())
      .contractType($jap.getAppointmentType())
      .build());
      logMsg("Rule : civil_circuit_judge_salaried_joh");
end;
```

### ORM: judicial org role mapping — Stage 2 (CIVIL district judge salaried, real source)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
rule "civil_district_judge_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_2_1.getValue())
  $joh: JudicialOfficeHolder(office == "CIVIL District Judge-Salaried")
then
   Map<String,JsonNode> attribute = new HashMap<>();
   attribute.put("contractType", JacksonUtils.convertObjectIntoJsonNode("Salaried"));
   attribute.put("jurisdiction", JacksonUtils.convertObjectIntoJsonNode("CIVIL"));
   attribute.put("primaryLocation", JacksonUtils.convertObjectIntoJsonNode($joh.getPrimaryLocation()));
   attribute.put("region", JacksonUtils.convertObjectIntoJsonNode($joh.getRegionId()));
   attribute.put("workTypes", JacksonUtils.convertObjectIntoJsonNode("decision_making_work,applications," +
                                                                     "multi_track_decision_making_work," +
                                                                     "intermediate_track_decision_making_work"));
  insert(
      RoleAssignment.builder()
      .actorIdType(ActorIdType.IDAM)
      .actorId($joh.getUserId())
      .roleCategory(RoleCategory.JUDICIAL)
      .roleType(RoleType.ORGANISATION)
      .roleName("district-judge")
      .grantType(GrantType.STANDARD)
      .classification(Classification.PUBLIC)
      .readOnly(false)
      .beginTime($joh.getBeginTime())
      .endTime($joh.getEndTime() !=null ? $joh.getEndTime().plusDays(1):null)
      .attributes(attribute)
      .authorisations($joh.getTicketCodes())
      .build());
      logMsg("Rule : civil_district_judge_org_role");
end;
```

### ORM: fee-paid judicial role requiring a JudicialBooking fact (CIVIL deputy district judge)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
rule "civil_deputy_district_judge_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_2_1.getValue())
  $joh: JudicialOfficeHolder(office in ("CIVIL Deputy District Judge-Fee-Paid",
                                        "CIVIL Deputy District Judge - Sitting in Retirement-Fee-Paid",
                                        "CIVIL District Judge (sitting in retirement)-Fee-Paid"))
  $bk: JudicialBooking(userId == $joh.userId)
then
   Map<String,JsonNode> attribute = new HashMap<>();
   attribute.put("contractType", JacksonUtils.convertObjectIntoJsonNode("Fee-Paid"));
   attribute.put("jurisdiction", JacksonUtils.convertObjectIntoJsonNode("CIVIL"));
   attribute.put("primaryLocation", JacksonUtils.convertObjectIntoJsonNode($bk.getLocationId() != null ?
       $bk.getLocationId():$joh.getPrimaryLocation()));
   attribute.put("baseLocation", JacksonUtils.convertObjectIntoJsonNode($bk.getLocationId()));
   attribute.put("region", JacksonUtils.convertObjectIntoJsonNode($bk.getRegionId()));
   attribute.put("workTypes", JacksonUtils.convertObjectIntoJsonNode("decision_making_work,applications," +
                                                                     "multi_track_decision_making_work," +
                                                                     "intermediate_track_decision_making_work"));
  insert(
      RoleAssignment.builder()
      .actorIdType(ActorIdType.IDAM)
      .actorId($joh.getUserId())
      .roleCategory(RoleCategory.JUDICIAL)
      .roleType(RoleType.ORGANISATION)
      .roleName("deputy-district-judge")
      .grantType(GrantType.STANDARD)
      .classification(Classification.PUBLIC)
      .readOnly(false)
      .beginTime($bk.getBeginTime())
      .endTime($bk.getEndTime())
      .attributes(attribute)
      .authorisations($joh.getTicketCodes())
      .build());
      logMsg("Rule : civil_deputy_district_judge_org_role");
end;
```

### ORM: obsolete rule disabled by a newer flag (two-flag pattern)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
/*
 * CIVIL "judge" Org role mapping.
 * Made obsolete in COT-905 - disabled by CIVIL_WA_2_1 flag.
 * To be removed in DTSAM-591.
 */
rule "civil_judge_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_0.getValue())
  $f2: FeatureFlag(status == false, flagName == FeatureFlagEnum.CIVIL_WA_2_1.getValue())
  $joh: JudicialOfficeHolder(office in ( "CIVIL District Judge-Salaried", "CIVIL Presiding Judge-Salaried",
                                        "CIVIL Resident Judge-Salaried", "CIVIL Tribunal Judge-Salaried"))
then
   // ... action body unchanged
   logMsg("Rule : civil_judge_org_role");
end;
```

### Role config JSON — pattern definition for `case-allocator` (real source)

```json
// Source: apps/am/am-role-assignment-service/src/main/resources/roleconfig/role_common.json
{
  "name": "case-allocator",
  "label": "Case Allocator",
  "description": "Case Allocator role for judicial users",
  "category": "JUDICIAL",
  "substantive": false,
  "type": "ORGANISATION",
  "patterns": [
    {
      "roleType": {
        "mandatory": true,
        "values": ["ORGANISATION"]
      },
      "grantType": {
        "mandatory": true,
        "values": ["STANDARD"]
      },
      "classification": {
        "mandatory": true,
        "values": ["PUBLIC", "PRIVATE"]
      },
      "attributes": {
        "jurisdiction": {
          "mandatory": true
        }
      }
    }
  ]
}
```

## See also

- [Role Assignment Lifecycle](role-assignment-lifecycle.md) — how assignments move through statuses and how the two-stage validation fits into the overall create flow
- [Org Role Mapping Flow](org-role-mapping-flow.md) — the full ORM flow from ASB event to RAS persistence, showing where Drools mapping rules execute
- [Write Drools Mapping Rules](../how-to/write-drools-mapping-rules.md) — step-by-step guide to adding ORM jurisdiction rules, feature flags, and Flyway migrations
- [Write Drools Validation Rules](../how-to/write-drools-validation-rules.md) — step-by-step guide to adding RAS validation rules and role-config patterns
