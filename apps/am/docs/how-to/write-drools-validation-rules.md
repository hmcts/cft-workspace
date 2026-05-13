---
title: Write Drools Validation Rules
topic: drools
diataxis: how-to
product: am
audience: both
sources:
  - am-role-assignment-service:src/main/resources/validationrules/core/role-assignment-config-validation.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/reject-unapproved-role-assignments.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/organisational-role-mapping-common.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/case-allocator-global.drl
  - am-role-assignment-service:src/main/resources/validationrules/core/load-case-data.drl
  - am-role-assignment-service:src/main/resources/META-INF/kmodule.xml
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/common/ValidationModelService.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/config/DroolConfig.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/RoleConfig.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/enums/FeatureFlagEnum.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/organisational-role-mapping-common.drl
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/reject-unapproved-role-assignments.drl
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/role-assignment-config-validation.drl
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/load-case-data.drl
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/iac/iac-case-role-validation-legal-ops.drl
  - apps/am/am-role-assignment-service/src/main/resources/META-INF/kmodule.xml
confluence:
  - id: "1440494617"
    title: "Validation Rules by Drools Engine"
    last_modified: "unknown"
    space: "AM"
  - id: "1385792545"
    title: "LLD - Role Assignment Service"
    last_modified: "unknown"
    space: "AM"
  - id: "1511137487"
    title: "Role Assignments for System Users"
    last_modified: "unknown"
    space: "AM"
  - id: "1491643419"
    title: "HLD - Role Assignment Service - v1.3"
    last_modified: "unknown"
    space: "AM"
  - id: "1386808483"
    title: "POST /am/role-assignments"
    last_modified: "unknown"
    space: "AM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Drools `.drl` files in `src/main/resources/validationrules/` control which role-assignment requests RAS approves or rejects.
- Rules operate on `RoleAssignment`, `Request`, `ExistingRoleAssignment`, `Case`, `FeatureFlag`, `CaseAllocatorApproval`, and `RoleConfig` facts inserted into a `StatelessKieSession`.
- A rule must set the assignment status to `CREATE_APPROVED` (stage 1); the built-in `validate_role_assignment_against_patterns` rule then validates against roleconfig JSON and sets `APPROVED` (stage 2).
- If no rule fires for a requested assignment, a fallback rule at `salience -1000` rejects it.
- New `.drl` files must belong to a package listed in `kmodule.xml` to be loaded at runtime.
- Validation is all-or-nothing: if any assignment in a multi-assignment request is rejected, the entire request fails and no assignments are persisted.

## Prerequisites

- Local clone of `am-role-assignment-service`.
- Java 17+ and Gradle wrapper (`./gradlew`).
- Familiarity with DRL (Drools Rule Language) syntax.

## Steps

### 1. Choose the correct package directory

Rules are organised by jurisdiction or concern under `src/main/resources/validationrules/`:

| Directory | Package declaration | Purpose |
|-----------|-------------------|---------|
| `core/` | `validationrules.core` | Cross-jurisdiction rules (ORM, case-allocator, specific/challenged access, config validation, rejection fallback, case data loading) |
| `iac/` | `validationrules.iac` | IAC-specific case role validation |
| `iac/common/` | `validationrules.iac.common` | IAC shared rules |
| `sscs/` | `validationrules.sscs` | SSCS-specific rules |
| `sscs/common/` | `validationrules.sscs.common` | SSCS shared rules |
| `civil/` | `validationrules.civil` | Civil-specific rules |
| `civil/common/` | `validationrules.civil.common` | Civil shared rules |
| `ccd/` | `validationrules.ccd` | CCD-trusted service rules |
| `wa/` | `validationrules.wa` | Work Allocation rules |
| `privatelaw/` | `validationrules.privatelaw` | Private Law (Family) rules |
| `publiclaw/` | `validationrules.publiclaw` | Public Law (CAFCASS/FPL) rules |
| `employment/` | `validationrules.employment` | Employment Tribunal rules |
| `stcic/` | `validationrules.stcic` | ST/CIC rules |
| `probate/` | `validationrules.probate` | Probate rules |
| `possessions/` | `validationrules.possessions` | Possessions rules |
| `prm/` | `validationrules.prm` | Professional Role Mapping rules |
| `test/` | `validationrules.test` | Diagnostic rules (logs all facts at salience 1000) |

Pick the directory matching your jurisdiction. For a new jurisdiction, create a new directory and register its package in `kmodule.xml` (see step 6).

### 2. Understand the fact model

When `ValidationModelService.runRulesOnAllRequestedAssignments()` executes (`ValidationModelService.java:132-176`), it inserts these facts into working memory:

| Fact type | Source | Key fields for matching |
|-----------|--------|------------------------|
| `Request` | The inbound request wrapper | `clientId`, `process`, `reference`, `replaceExisting`, `assignerId`, `authenticatedUserId`, `byPassOrgDroolRule` |
| `RoleAssignment` | Each requested role | `roleName`, `roleType`, `roleCategory`, `grantType`, `classification`, `status`, `attributes` (Map) |
| `ExistingRoleAssignment` | DB-fetched assignments for assigner/assignee | Same fields as `RoleAssignment` but a distinct Java type |
| `Case` | Loaded on-demand by `load-case-data.drl` | `id`, `jurisdiction`, `caseTypeId`, `securityClassification`, `data` (Map), `region` (derived), `baseLocation` (derived) |
| `RoleConfig` | Singleton loaded from all roleconfig JSON files | Used by the pattern-validation rule |
| `FeatureFlag` | One per flag in `flag_config` DB table | `flagName` (String), `status` (boolean) |
| `CaseAllocatorApproval` | Inserted by case-allocator rules | Wraps the `RoleAssignment` being approved by case-allocator flow |

The `RoleAssignment.attributes` map contains keys such as `jurisdiction`, `caseId`, `caseType`, `region`, `baseLocation`.

#### Case data loading

The `load-case-data.drl` rule automatically fetches case data from CCD data store when a `RoleAssignment` has a `caseId` attribute. This makes the `Case` fact available for matching in jurisdiction-specific rules. Certain trusted clients (`ccd_data`, `aac_manage_case_assignment`, `ccd_case_disposer`, `disposer-idam-user`) are excluded from case data loading since they already own the case context.

#### Feature flags and environment behaviour

Feature flags are loaded from the `flag_config` database table. In production, flags are cached at startup via `DBFlagConfigurtion.getDroolFlagStates()`. In lower environments, flags are fetched fresh from the database for each validation run.

<!-- CONFLUENCE-ONLY: Confluence LLD documents that the byPassOrgDroolRule mechanism was introduced to give flexibility in lower envs (Preview, AAT, ITHC, Demo) for other services to create ORG role assignments without ORM. Source confirms this exists in organisational-role-mapping-common.drl and is controlled by BYPASS_ORG_DROOL_RULE env variable. -->

### 3. Write the rule file

Create a new `.drl` file in the chosen directory. Example: approving a CASE role for a trusted service caller.

```drools
package validationrules.civil;

import uk.gov.hmcts.reform.roleassignment.domain.model.RoleAssignment;
import uk.gov.hmcts.reform.roleassignment.domain.model.Request;
import uk.gov.hmcts.reform.roleassignment.domain.model.enums.Status;
import uk.gov.hmcts.reform.roleassignment.domain.model.enums.RoleType;
import uk.gov.hmcts.reform.roleassignment.domain.model.enums.GrantType;
import uk.gov.hmcts.reform.roleassignment.domain.model.enums.RoleCategory;
import function uk.gov.hmcts.reform.roleassignment.domain.service.common.ValidationModelService.logMsg;

rule "civil_service_create_case_role"
when
    $rq: Request(
        clientId == "civil_service"
    )
    $ra: RoleAssignment(
        status == Status.CREATE_REQUESTED,
        roleType == RoleType.CASE,
        grantType == GrantType.SPECIFIC,
        roleCategory in (RoleCategory.PROFESSIONAL, RoleCategory.JUDICIAL),
        attributes["jurisdiction"] != null && attributes["jurisdiction"].asText() == "CIVIL",
        attributes["caseId"] != null,
        attributes["caseType"] != null
    )
then
    $ra.setStatus(Status.CREATE_APPROVED);
    $ra.log("Stage 1 approved: civil_service_create_case_role");
    update($ra);
    logMsg("Rule : civil_service_create_case_role");
end
```

Key points:

- The `package` declaration must match one listed in `kmodule.xml:4-19`.
- Pattern-match on `$rq.clientId` to restrict which S2S callers can trigger the rule.
- Set status to `CREATE_APPROVED` (not `APPROVED`) -- the built-in `validate_role_assignment_against_patterns` rule handles stage 2 (`role-assignment-config-validation.drl:44-63`).
- Call `$ra.log(...)` to leave an audit trail of which rule fired.
- Call `update($ra)` after changing the status -- this notifies the Drools engine of the fact modification.
- Use `logMsg(...)` (imported static function from `ValidationModelService`) for debug logging, not `System.out.println()`.

<!-- DIVERGENCE: Confluence page "Validation Rules by Drools Engine" (1440494617) shows System.out.println() in rule actions, but source uses logMsg() imported from ValidationModelService.logMsg. Source wins. -->

#### Writing delete-approval rules

Delete operations follow the same pattern but use `DELETE_REQUESTED` and `DELETE_APPROVED` statuses:

```drools
rule "civil_service_delete_case_role"
when
    $rq: Request(clientId == "civil_service")
    $ra: RoleAssignment(
        status == Status.DELETE_REQUESTED,
        roleType == RoleType.CASE,
        roleCategory in (RoleCategory.PROFESSIONAL, RoleCategory.JUDICIAL),
        attributes["jurisdiction"] != null && attributes["jurisdiction"].asText() == "CIVIL")
then
    $ra.setStatus(Status.DELETE_APPROVED);
    $ra.log("Delete approved : civil_service_delete_case_role");
    update($ra);
    logMsg("Rule : civil_service_delete_case_role");
end
```

If no delete rule fires, `reject_unapproved_delete_role_assignments` (salience -1000) sets `DELETE_REJECTED`.

#### Writing system-user rules

For system user role assignments (e.g. automated processes accessing case data), rules typically validate against `process`, `reference`, and `replaceExisting` in addition to clientId:

```drools
rule "my_service_system_user_roles_create"
when
    $rq: Request(
             clientId == "my_service",
             process == "my-service-system-users",
             reference == "my-service-automation-system-user",
             replaceExisting == true)
    $ra: RoleAssignment(
             status == Status.CREATE_REQUESTED,
             roleType == RoleType.ORGANISATION,
             roleName in ("my-automation-system-user"),
             roleCategory == RoleCategory.SYSTEM,
             grantType == GrantType.STANDARD,
             attributes["jurisdiction"] != null && attributes["jurisdiction"].asText() == "MYJURISDICTION")
then
    $ra.setStatus(Status.CREATE_APPROVED);
    $ra.log("Create approved : my_service_system_user_roles_create");
    update($ra);
    logMsg("Rule : my_service_system_user_roles_create");
end
```

<!-- CONFLUENCE-ONLY: Confluence "Role Assignments for System Users" (1511137487) specifies naming conventions: process = "<component>-system-users", reference = "<subset>-system-users", roleName = "<service>-<purpose>-system-user". Not verified in source as a hard requirement, but all existing system-user rules follow this convention. -->

#### Using ExistingRoleAssignment for caller-role-based rules

For rules that require the assigner or assignee to hold a specific existing role (e.g. IAC case allocation), match against `ExistingRoleAssignment`:

```drools
rule "my_jurisdiction_caseworker_create_case_roles"
when
    $rq: Request(assignerId == authenticatedUserId)
    $ra: RoleAssignment(
        status == Status.CREATE_REQUESTED,
        roleType == RoleType.CASE,
        roleName == "tribunal-caseworker",
        attributes["caseId"] != null && $caseId : attributes["caseId"].asText())
    Case(
        id == $caseId,
        jurisdiction == "MYJURISDICTION")
    ExistingRoleAssignment(
        actorId == $ra.actorId,
        roleType == RoleType.ORGANISATION,
        roleName in ("tribunal-caseworker", "senior-tribunal-caseworker"),
        attributes["jurisdiction"] != null && attributes["jurisdiction"].asText() == "MYJURISDICTION")
    ExistingRoleAssignment(
        actorId == $rq.assignerId,
        roleType == RoleType.ORGANISATION,
        roleName in ("tribunal-caseworker", "senior-tribunal-caseworker"),
        attributes["jurisdiction"] != null && attributes["jurisdiction"].asText() == "MYJURISDICTION")
then
    $ra.setStatus(Status.CREATE_APPROVED);
    $ra.log("Stage 1 approved : my_jurisdiction_caseworker_create_case_roles");
    update($ra);
    logMsg("Rule : my_jurisdiction_caseworker_create_case_roles");
end
```

This pattern validates that:
- The assigner is the authenticated user (no delegation).
- The assignee already holds an appropriate organisational role.
- The assigner already holds an appropriate organisational role.
- The case belongs to the expected jurisdiction.

### 4. Gate behind a feature flag (optional)

If the rule should be toggled per environment, add a `FeatureFlag` condition:

```drools
    $flag: FeatureFlag(
        flagName == "my_jurisdiction_wa_1_0",
        status == true
    )
```

Note: the `flagName` field is a plain String, not an enum reference in the DRL. The available flag names are defined in `FeatureFlagEnum.java` and stored in the `flag_config` database table. Current flags include: `iac_1_1`, `iac_jrd_1_0`, `ccd_bypass_1_0`, `sscs_wa_1_0`, `probate_wa_1_0`, `all_wa_services_case_allocator_1_0`, among others.

You will also need a Flyway migration to insert the flag into `flag_config` for each environment. See the existing migration pattern in `src/main/resources/db/migration/` (e.g. `V20260330_1150__COT-1150_PROBATE_WA_1_0_base_flag_addition.sql`).

### 5. Add a matching role-config pattern

If the role name does not yet exist in the roleconfig JSON, add an entry to the appropriate file under `src/main/resources/roleconfig/` (e.g. `role_civil.json`):

```json
{
  "name": "my-new-case-role",
  "label": "My New Case Role",
  "description": "...",
  "category": "PROFESSIONAL",
  "type": "CASE",
  "substantive": false,
  "patterns": [
    {
      "roleType": { "mandatory": true, "values": ["CASE"] },
      "grantType": { "mandatory": true, "values": ["SPECIFIC"] },
      "classification": { "mandatory": true, "values": ["PUBLIC", "PRIVATE", "RESTRICTED"] },
      "attributes": {
        "jurisdiction": { "mandatory": true, "values": ["CIVIL"] },
        "caseType": { "mandatory": true },
        "caseId": { "mandatory": true }
      }
    }
  ]
}
```

Key points about role-config pattern matching:

- The `load_role_config_patterns` rule looks up the role config using a composite key of `(roleName, roleCategory, roleType)` -- not just `roleName` alone. This means the same role name can have different patterns for different categories/types.
- The `substantive` field (boolean) is copied into the role assignment attributes as `"Y"` or `"N"` during stage 2 validation.
- The `validate_role_assignment_against_patterns` rule checks: `roleType`, `grantType`, `classification`, `beginTime`, `endTime`, and all `attributes` defined in the pattern.
- Pattern fields that are omitted or null impose no constraint.
- An attribute marked `"mandatory": true` with no `"values"` array means the attribute must be present but can have any value.
- An attribute with a `"values"` array means the attribute value must be one of the listed values.

<!-- DIVERGENCE: Confluence page "Validation Rules by Drools Engine" (1440494617) shows RoleConfig.get($roleName) with a single argument, but source (RoleConfig.java:28) uses get($roleName, $roleCategory, $roleType) with a composite key. The load_role_config_patterns rule (role-assignment-config-validation.drl:26-37) also binds $roleCategory and $roleType. Source wins. -->

Without a matching pattern, stage 2 validation (`validate_role_assignment_against_patterns`) will not fire and the assignment will be rejected by the fallback rule at `reject-unapproved-role-assignments.drl:11`.

### 6. Register the package in kmodule.xml (new jurisdictions only)

If you created a new directory (e.g. `validationrules/myjurisdiction/`), add the package to the KieBase definition in `src/main/resources/META-INF/kmodule.xml`:

```xml
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
                validationrules.possessions,
                validationrules.myjurisdiction">
    <ksession name="role-assignment-validation-session" type="stateless"/>
</kbase>
```

If the package is not listed here, the rule file will not be loaded into the KieSession (`kmodule.xml:4`, `DroolConfig.java:21`).

Note: sub-packages (e.g. `validationrules.civil.common`) must be registered separately -- they are not automatically included by registering the parent package.

### 7. Write a unit/integration test

RAS tests Drools rules by inserting facts directly into a `StatelessKieSession`. Create a test class in the corresponding test directory:

```java
@Test
void shouldApproveRoleAssignmentForCivilService() {
    Request request = TestDataBuilder.buildRequest();
    request.setClientId("civil_service");

    RoleAssignment roleAssignment = TestDataBuilder.buildRoleAssignment();
    roleAssignment.setStatus(Status.CREATE_REQUESTED);
    roleAssignment.setRoleType(RoleType.CASE);
    roleAssignment.setGrantType(GrantType.SPECIFIC);
    roleAssignment.setRoleCategory(RoleCategory.PROFESSIONAL);
    roleAssignment.getAttributes().put("jurisdiction", JsonNodeFactory.instance.textNode("CIVIL"));
    roleAssignment.getAttributes().put("caseId", JsonNodeFactory.instance.textNode("1234567890123456"));
    roleAssignment.getAttributes().put("caseType", JsonNodeFactory.instance.textNode("CIVIL"));

    List<Command<?>> commands = List.of(
        CommandFactory.newInsert(request),
        CommandFactory.newInsert(roleAssignment),
        CommandFactory.newInsert(buildFeatureFlag(FeatureFlagEnum.CIVIL_WA_1_0, true)),
        CommandFactory.newFireAllRules()
    );

    kieSession.execute(CommandFactory.newBatchExecution(commands));

    assertEquals(Status.CREATE_APPROVED, roleAssignment.getStatus());
}
```

Run tests with:

```bash
./gradlew test --tests "*CivilDroolsTest*"
```

## Verify

1. Run the full test suite to confirm no existing rules are broken:

   ```bash
   ./gradlew test
   ```

2. Check that the `log` field on your `RoleAssignment` contains your rule name after execution:

   ```java
   assertTrue(roleAssignment.getLog().contains("civil_service_create_case_role"));
   ```

3. For end-to-end verification in a deployed environment, submit a role-assignment request via `POST /am/role-assignments` with matching attributes. A successful response (HTTP 201) with status `LIVE` confirms the rule fired and both validation stages passed. A 422 response with `REJECTED` status indicates the rule did not match. The response `log` field contains newline-separated entries showing which rules fired (or the rejection reason).

## Validation flow summary

The two-stage validation process works as follows:

```
CREATE_REQUESTED
    |
    v
[Stage 1: Jurisdiction/caller-specific rule fires]
    |
    v
CREATE_APPROVED
    |
    v
[load_role_config_patterns: loads patterns for this roleName+roleCategory+roleType]
    |
    v
[Stage 2: validate_role_assignment_against_patterns matches a pattern]
    |
    v
APPROVED --> (if all assignments approved) --> LIVE
    |
    (if pattern doesn't match)
    |
    v
[reject_unapproved_create_role_assignments (salience -1000)]
    |
    v
REJECTED
```

If any single `RoleAssignment` in a batch request ends up `REJECTED`, the entire request fails and all assignments are rejected -- even those that individually passed validation. This all-or-nothing behaviour is by design, to ensure atomic operations.

## Common pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| Rule never fires | Package not in `kmodule.xml` | Add the package to the `<kbase>` packages attribute |
| Assignment rejected despite rule firing | No matching pattern in roleconfig JSON | Add a pattern entry to the relevant `role_*.json` file |
| Pattern not found despite correct roleName | RoleConfig lookup uses composite key `(roleName, roleCategory, roleType)` | Ensure your roleconfig entry has matching `category` and `type` fields |
| `ExistingRoleAssignment` vs `RoleAssignment` confusion | Drools uses Java type for pattern matching | Use `ExistingRoleAssignment` when matching caller's existing roles; `RoleAssignment` for the requested assignment |
| Feature flag not honoured | Flag not in `flag_config` table for this environment | Add a Flyway migration inserting the flag row |
| Status set to `APPROVED` directly | Skipping stage 2 pattern validation | Always set `CREATE_APPROVED` in your rule; let `role-assignment-config-validation.drl` handle stage 2 |
| Case data not available in rule | Rule for a client that is excluded from case data loading | Check `load-case-data.drl` -- trusted clients like `ccd_data` bypass case loading. Remove exclusion or restructure rule. |
| Rule fires in lower envs but not prod | `byPassOrgDroolRule` is true in non-prod | Ensure your rule does not rely on the bypass; test with `BYPASS_ORG_DROOL_RULE=false` |
| `substantive` attribute missing from approved assignment | Pattern matched but `substantive` field not set in roleconfig | Add `"substantive": true` or `"substantive": false` to the role definition in the JSON |
| Batch request partially rejected | One assignment fails, entire request rejected | All assignments in a single request must pass -- fix the failing assignment or split into separate requests |

## Examples

### RAS: ORM trusted service rule (real source)

The actual `staff_organisational_role_mapping_service_create` rule in production. This is the primary service-trust rule that approves all ORM-originated organisational role requests in Stage 1.

```drool
// Source: apps/am/am-role-assignment-service/src/main/resources/validationrules/core/organisational-role-mapping-common.drl
package validationrules.core;
import uk.gov.hmcts.reform.roleassignment.domain.model.RoleAssignment;
import uk.gov.hmcts.reform.roleassignment.domain.model.Request;
import uk.gov.hmcts.reform.roleassignment.domain.model.enums.Status;
import uk.gov.hmcts.reform.roleassignment.domain.model.enums.RoleCategory;
import uk.gov.hmcts.reform.roleassignment.domain.model.enums.RoleType;
import function uk.gov.hmcts.reform.roleassignment.domain.service.common.ValidationModelService.logMsg;

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
```

### RAS: system-user rule pattern (SSCS hearing manager, real source)

A system-user rule validates `process`, `reference`, and `replaceExisting` in addition to `clientId`.

```drool
// Source: apps/am/am-role-assignment-service/src/main/resources/validationrules/core/organisational-role-mapping-common.drl
rule "sscs_system_user_hearings_roles_create"
when
    $rq: Request(
             clientId == "sscs",
             process == "sscs-system-users",
             reference == "sscs-hearings-system-user",
             replaceExisting == true)
    $ra: RoleAssignment(
             status == Status.CREATE_REQUESTED,
             roleType == RoleType.ORGANISATION,
             classification == Classification.PUBLIC,
             roleName in ("hearing-manager","hearing-viewer"),
             roleCategory == RoleCategory.SYSTEM,
             grantType == GrantType.STANDARD,
             attributes["jurisdiction"] != null && attributes["jurisdiction"].asText() == "SSCS")
then
    $ra.setStatus(Status.CREATE_APPROVED);
    $ra.log("Create approved : sscs_system_user_hearings_roles_create");
    update($ra);
    logMsg("Rule : sscs_system_user_hearings_roles_create");
end;
```

### RAS: rejection fallback (real source, salience -1000)

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

### RAS: case-allocator approved case role using ExistingRoleAssignment check (IAC, real source)

This pattern demonstrates how `CaseAllocatorApproval` and `ExistingRoleAssignment` combine to enforce the requirement that the assignee already holds an appropriate org role before getting a case role.

```drool
// Source: apps/am/am-role-assignment-service/src/main/resources/validationrules/iac/iac-case-role-validation-legal-ops.drl
rule "ia_case_allocator_approved_create_case_manager_role_v11"
when
    $f : FeatureFlag(status && flagName == FeatureFlagEnum.IAC_1_1.getValue())
    $ca: CaseAllocatorApproval(
                 roleAssignment.status == Status.CREATE_REQUESTED,
                 roleAssignment.attributes["jurisdiction"].asText() == "IA",
                 roleAssignment.attributes["caseType"].asText() == "Asylum",
                 roleAssignment.roleName == "case-manager" )
         ExistingRoleAssignment(
                 actorId == $ca.getRoleAssignment().actorId,
                 roleType == RoleType.ORGANISATION,
                 roleName in ("tribunal-caseworker", "senior-tribunal-caseworker"),
                 attributes["jurisdiction"] != null && attributes["jurisdiction"].asText() == "IA")
then
    $ca.getRoleAssignment().setStatus(Status.CREATE_APPROVED);
    $ca.getRoleAssignment().log("Stage 1 approved : ia_case_allocator_approved_create_case_manager_role_v11");
    update($ca.getRoleAssignment());
    logMsg("Rule : ia_case_allocator_approved_create_case_manager_role_v11");
end;
```

### RAS: kmodule.xml (real source)

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

Note: `validationrules.dev` and `validationrules.prm` are absent — those rule files exist on disk but are never loaded by the engine in any environment.

## See also

- [Drools Rules](../explanation/drools-rules.md) — conceptual explanation of the two-stage RAS validation pipeline, fact types, fallback rejection, and bypass mechanisms
- [Role Assignment Lifecycle](../explanation/role-assignment-lifecycle.md) — the status state machine (`CREATE_REQUESTED` → `APPROVED` → `LIVE`) that your rules drive
- [RAS API Reference](../reference/api-role-assignment-service.md) — enumerated values for `RoleType`, `GrantType`, `Classification`, and `RoleCategory` used in rule conditions
- [Write Drools Mapping Rules](write-drools-mapping-rules.md) — the counterpart guide for adding ORM mapping rules that produce the assignments your validation rules must approve
