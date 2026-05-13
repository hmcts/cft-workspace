---
title: Write Drools Mapping Rules
topic: drools
diataxis: how-to
product: am
audience: both
sources:
  - am-org-role-mapping-service:src/main/resources/META-INF/kmodule.xml
  - am-org-role-mapping-service:src/main/resources/validationrules/core/core.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-caseworker-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-multi-region.drl
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/DroolConfig.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/config/DBFlagConfigurtion.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/enums/FeatureFlagEnum.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/helper/AssignmentRequestBuilder.java
  - am-org-role-mapping-service:src/main/resources/db/migration/V1.2__new_flag_config_table.sql
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-caseworker-mapping.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
  - apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.10__employment_wa_base_flag_addition.sql
  - apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.2__new_flag_config_table.sql
  - apps/am/am-org-role-mapping-service/src/main/resources/META-INF/kmodule.xml
confluence:
  - id: "1507735022"
    title: "User roles and rule configuration requirements"
    last_modified: "unknown"
    space: "AM"
  - id: "1440494617"
    title: "Validation Rules by Drools Engine"
    last_modified: "unknown"
    space: "AM"
  - id: "1482333531"
    title: "HLD - Feature-Flagging of Rules"
    last_modified: "unknown"
    space: "AM"
  - id: "1446904483"
    title: "Judicial Booking Mapping Rules"
    last_modified: "unknown"
    space: "AM"
  - id: "1593576197"
    title: "AM applications feature flags"
    last_modified: "unknown"
    space: "AM"
  - id: "1460539904"
    title: "End to end data flow scenarios for staff org role mapping"
    last_modified: "unknown"
    space: "AM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- ORM maps staff/judicial profiles to organisational role assignments using Drools `.drl` files under `src/main/resources/validationrules/{jurisdiction}/`.
- Caseworker rules are single-stage: match `CaseWorkerAccessProfile` and insert a `RoleAssignment`.
- Judicial rules are two-stage: Stage 1 maps `JudicialAccessProfile` to a `JudicialOfficeHolder`, Stage 2 maps the office holder to `RoleAssignment`.
- Every rule must be guarded by a `FeatureFlag` condition (placed first in the `when` clause); adding a new flag requires a Flyway migration to `flag_config` (with `service_name`, `env`, and `status` columns) plus a new entry in `FeatureFlagEnum`.
- The Drools session is stateless (`StatelessKieSession`) -- facts are inserted fresh per execution, no working memory persists between calls.
- In production, flags are loaded once on startup into a static `ConcurrentHashMap`; in non-prod environments they are re-fetched from the database on every execution.

## Prerequisites

- Local clone of `am-org-role-mapping-service`.
- Familiarity with the jurisdiction you are targeting (its `serviceCode`, existing rule files, and role definitions).
- Access to the ORM Postgres database schema (for Flyway migrations adding feature flags).

## Understand the file layout

Rule files live under `src/main/resources/validationrules/`. Each jurisdiction has its own package directory:

```
validationrules/
  core/
    core.drl                              # getRoleAssignments query
  civil/
    civil-caseworker-mapping.drl
    civil-admin-mapping.drl
    civil-ctsc-mapping.drl
    civil-judicial-office-holder-mapping.drl
    civil-judicial-org-role-mapping.drl
    civil-multi-region.drl
  iac/
    ...
  sscs/
    ...
```

Existing jurisdictions declared in `kmodule.xml` (source of truth): `iac`, `sscs`, `civil`, `privatelaw`, `publiclaw`, `employment`, `stcic`, `hrs`, `probate` (plus `core`). All rule packages are loaded into a single stateless Kie session named `org-role-mapping-validation-session`.

The naming convention per jurisdiction is:

| File suffix | Purpose |
|---|---|
| `{jur}-caseworker-mapping.drl` | Staff caseworker roles |
| `{jur}-admin-mapping.drl` | Admin roles |
| `{jur}-ctsc-mapping.drl` | CTSC roles |
| `{jur}-judicial-office-holder-mapping.drl` | Stage 1: `JudicialAccessProfile` to `JudicialOfficeHolder` |
| `{jur}-judicial-org-role-mapping.drl` | Stage 2: `JudicialOfficeHolder` to `RoleAssignment` |
| `{jur}-multi-region.drl` | Multi-region cloning for certain roles |

## Standard DRL file header

Every `.drl` file requires a package declaration matching its directory and standard imports. Here is the template header for a caseworker mapping file:

```drool
package validationrules.{jurisdiction};
import uk.gov.hmcts.reform.orgrolemapping.domain.model.RoleAssignment;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.ActorIdType;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.RoleCategory;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.RoleType;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.Classification;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.GrantType;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.CaseWorkerAccessProfile;
import uk.gov.hmcts.reform.orgrolemapping.util.JacksonUtils;
import java.util.HashMap
import java.util.Map
import com.fasterxml.jackson.databind.JsonNode;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.FeatureFlag;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.FeatureFlagEnum;
import function uk.gov.hmcts.reform.orgrolemapping.domain.service.RequestMappingService.logMsg;
```

For judicial office-holder mapping (Stage 1), additionally import:

```drool
import uk.gov.hmcts.reform.orgrolemapping.domain.model.JudicialAccessProfile;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.JudicialOfficeHolder;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.Authorisation;
import java.time.ZonedDateTime;
import function uk.gov.hmcts.reform.orgrolemapping.helper.AssignmentRequestBuilder.validateAuthorisation;
import function uk.gov.hmcts.reform.orgrolemapping.domain.service.RequestMappingService.addAndGetTicketCodes;
```

For judicial org-role mapping (Stage 2), additionally import:

```drool
import uk.gov.hmcts.reform.orgrolemapping.domain.model.JudicialOfficeHolder;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.JudicialBooking;
```

## Write a caseworker mapping rule

Caseworker rules are single-stage. Each rule matches a `CaseWorkerAccessProfile` and inserts a `RoleAssignment`.

1. Open or create `src/main/resources/validationrules/{jurisdiction}/{jur}-caseworker-mapping.drl`.

2. Add a rule following this pattern (based on `civil-caseworker-mapping.drl:22-45`):

```drool
rule "v1_0_{jur}_senior_tribunal_caseworker_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.YOUR_FLAG.getValue())
  $cap: CaseWorkerAccessProfile(roleId == "{roleId-from-CRD}",
                                serviceCode in ("{serviceCode}"),
                                !suspended)
then
   Map<String,JsonNode> attribute = new HashMap<>();
   attribute.put("jurisdiction", JacksonUtils.convertObjectIntoJsonNode("{JURISDICTION}"));
   attribute.put("primaryLocation", JacksonUtils.convertObjectIntoJsonNode($cap.getPrimaryLocationId()));
   attribute.put("workTypes", JacksonUtils.convertObjectIntoJsonNode("decision_making_work,applications"));
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
      logMsg("Rule : v1_0_{jur}_senior_tribunal_caseworker_org_role");
end;
```

Note: the actual source uses `Map<String,JsonNode>` with `JacksonUtils.convertObjectIntoJsonNode()` per attribute, not `Map.of()`. The `.authorisations($cap.getSkillCodes())` call propagates CRD skill codes to the role assignment. The `logMsg` call provides runtime tracing.

3. Key constraints to use:
   - `!suspended` -- excludes suspended caseworkers (ORM sends an empty assignment list to RAS, which deletes all existing roles for that user).
   - `taskSupervisorFlag == "Y"` -- for task-supervisor variants.
   - `caseAllocatorFlag == "Y"` -- for case-allocator variants.
   - `roleId in ("1","2")` -- CRD role IDs; `"1"` = senior, `"2"` = standard caseworker (varies by jurisdiction).
   - `serviceCode in ("AAA6", "AAA7")` -- match multiple service codes with `in(...)` when needed.

4. Attribute guidance (from AM design):
   - Only set attributes that are relevant to the role. Do not set an attribute (e.g. `primaryLocation`) if the role is not scoped to a specific location -- unset attributes mean "unrestricted" when CCD evaluates access.
   - `workTypes` is a comma-separated string of applicable work types. Known values include: `hearing_work`, `decision_making_work`, `applications`, `access_requests`, `routine_work`, `priority`, `error_management`, `upper_tribunal`, `multi_track_decision_making_work`, `intermediate_track_decision_making_work`.
   <!-- CONFLUENCE-ONLY: workTypes list comes from Confluence "User roles and rule configuration requirements" page; no single canonical source file enumerates all valid values -->

## Write a judicial mapping rule (two stages)

### Stage 1: JudicialAccessProfile to JudicialOfficeHolder

4. Open or create `src/main/resources/validationrules/{jurisdiction}/{jur}-judicial-office-holder-mapping.drl`.

5. Add a rule that matches `JudicialAccessProfile` and inserts a `JudicialOfficeHolder` (based on `civil-judicial-office-holder-mapping.drl:31-53`):

```drool
rule "{jur}_circuit_judge_salaried_joh"
when
   $f:  FeatureFlag(status && flagName == FeatureFlagEnum.YOUR_FLAG.getValue())
   $jap: JudicialAccessProfile(appointment == "Circuit Judge",
                               appointmentType in ("Salaried", "SPTW"),
                               (endTime == null || endTime.compareTo(ZonedDateTime.now()) >= 0),
                               (validateAuthorisation(authorisations, "{serviceCode}")))
then
  insert(
      JudicialOfficeHolder.builder()
      .userId($jap.getUserId())
      .office("{JURISDICTION} Circuit Judge-Salaried")
      .jurisdiction("{jurisdiction}")
      .ticketCodes($jap.getTicketCodes())
      .beginTime($jap.getBeginTime())
      .endTime($jap.getEndTime())
      .regionId($jap.getRegionId())
      .baseLocationId($jap.getBaseLocationId())
      .primaryLocation($jap.getPrimaryLocationId())
      .contractType($jap.getAppointmentType())
      .build());
      logMsg("Rule : {jur}_circuit_judge_salaried_joh");
end;
```

Key differences from caseworker rules:
- Judicial rules use `validateAuthorisation(authorisations, "{serviceCode}")` (a static helper function) to match service codes via the judicial authorisations list, rather than matching `serviceCode` directly on the profile.
- The `endTime` null-check `(endTime == null || endTime.compareTo(ZonedDateTime.now()) >= 0)` ensures only current/future appointments are mapped.
- `appointmentType in ("Salaried", "SPTW")` -- SPTW (Sitting Part-Time Worker) is treated as salaried.
- Import `function uk.gov.hmcts.reform.orgrolemapping.helper.AssignmentRequestBuilder.validateAuthorisation` at the top of the file.

### Stage 2: JudicialOfficeHolder to RoleAssignment

6. Open or create `src/main/resources/validationrules/{jurisdiction}/{jur}-judicial-org-role-mapping.drl`.

7. Add a rule that matches the `JudicialOfficeHolder.office` string and inserts a `RoleAssignment` (based on `civil-judicial-org-role-mapping.drl:65-95`):

```drool
rule "{jur}_circuit_judge_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.YOUR_FLAG.getValue())
  $joh: JudicialOfficeHolder(office == "{JURISDICTION} Circuit Judge-Salaried")
then
   Map<String,JsonNode> attribute = new HashMap<>();
   attribute.put("contractType", JacksonUtils.convertObjectIntoJsonNode("Salaried"));
   attribute.put("jurisdiction", JacksonUtils.convertObjectIntoJsonNode("{JURISDICTION}"));
   attribute.put("primaryLocation", JacksonUtils.convertObjectIntoJsonNode($joh.getPrimaryLocation()));
   attribute.put("region", JacksonUtils.convertObjectIntoJsonNode($joh.getRegionId()));
   attribute.put("workTypes", JacksonUtils.convertObjectIntoJsonNode("hearing_work,decision_making_work"));
  insert(
      RoleAssignment.builder()
      .actorIdType(ActorIdType.IDAM)
      .actorId($joh.getUserId())
      .roleCategory(RoleCategory.JUDICIAL)
      .roleType(RoleType.ORGANISATION)
      .roleName("circuit-judge")
      .grantType(GrantType.STANDARD)
      .classification(Classification.PUBLIC)
      .readOnly(false)
      .beginTime($joh.getBeginTime())
      .endTime($joh.getEndTime() != null ? $joh.getEndTime().plusDays(1) : null)
      .attributes(attribute)
      .authorisations($joh.getTicketCodes())
      .build());
      logMsg("Rule : {jur}_circuit_judge_org_role");
end;
```

Key points for Stage 2:
- Salaried roles set `endTime` to `$joh.getEndTime().plusDays(1)` -- but always null-check first: `$joh.getEndTime() != null ? ... : null`.
- `.authorisations($joh.getTicketCodes())` propagates JRD authorisation codes into the role assignment (used by CCD for fine-grained access control).
- `contractType` is set from a literal matching the appointment type (e.g. `"Salaried"` or `"Fee-Paid"`), not from `$joh.getContractType()` directly in some rules.

### Fee-paid judicial variant

8. Fee-paid roles require a `JudicialBooking` fact in the session. Add a booking match:

```drool
rule "{jur}_fee_paid_judge_org_role"
when
    $f: FeatureFlag(status && flagName == FeatureFlagEnum.YOUR_FLAG.getValue())
    $joh: JudicialOfficeHolder(office == "{JURISDICTION} Deputy Judge-Fee-Paid")
    $bk: JudicialBooking(userId == $joh.userId)
then
    RoleAssignment ra = RoleAssignment.builder()
        // ... same builder pattern but use $bk.getLocationId() and $bk.getRegionId()
        .beginTime($bk.getBeginTime())
        .endTime($bk.getEndTime())
        .attributes(JacksonUtils.convertObjectIntoJsonNode(
            Map.of("jurisdiction", "{jurisdiction}",
                   "primaryLocation", $bk.getLocationId(),
                   "region", $bk.getRegionId(),
                   "contractType", "Fee-Paid",
                   "bookable", true
            )))
        .build();
    insert(ra);
end
```

The booking provides `locationId` and `regionId` for the role assignment attributes (`civil-judicial-org-role-mapping.drl:100-135`).

## Add the FeatureFlag

Every rule is guarded by a `FeatureFlag` condition. You must register the flag in two places:

9. Add a new constant to `src/main/java/.../domain/model/enums/FeatureFlagEnum.java`:

```java
YOUR_FLAG_NAME("your_flag_name"),
```

Flag naming convention: `{jurisdiction}_{type}_{major}_{minor}` where `{type}` is typically `wa` (Work Allocation), `hearing`, or `jrd`. Examples: `civil_wa_1_0`, `sscs_hearing_1_0`, `iac_jrd_1_0`, `employment_wa_3_0`, `probate_wa_1_0`.

10. Add a Flyway migration to insert the flag into `flag_config`. The table schema is `(id, flag_name, env, service_name, status)`. Create a new file under `src/main/resources/db/migration/`:

```sql
-- V{next}__{TICKET}_add_your_flag.sql
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('your_flag_name', 'local', '{jurisdiction}', 'true');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('your_flag_name', 'pr', '{jurisdiction}', 'true');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('your_flag_name', 'aat', '{jurisdiction}', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('your_flag_name', 'demo', '{jurisdiction}', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('your_flag_name', 'perftest', '{jurisdiction}', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('your_flag_name', 'ithc', '{jurisdiction}', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('your_flag_name', 'prod', '{jurisdiction}', 'false');
```

<!-- DIVERGENCE: Confluence "AM applications feature flags" shows flags enabled in most lower envs from the start, but source code (e.g. V1.10__employment_wa_base_flag_addition.sql) shows new flags set to 'false' in aat/demo/perftest/ithc/prod and only 'true' in local/pr. Flags are later enabled by separate migrations. Source wins. -->

Set `status=false` for `prod` (and typically `aat`/`demo`/`perftest`/`ithc`) initially -- enable in lower environments via separate Flyway migrations after merge, then enable in prod only after testing. The migration file naming convention is `V{version}__{JIRA-TICKET}_description.sql` (e.g. `V1.10__employment_wa_base_flag_addition.sql`).

**Flag loading behaviour** (`DBFlagConfigurtion.java` + `RequestMappingService.java:218-239`):
- On startup, `DBFlagConfigurtion` (a `CommandLineRunner`) loads all `FeatureFlagEnum` values from the `flag_config` table into a static `ConcurrentHashMap<String, Boolean>`.
- In **production**, `RequestMappingService.getDBFeatureFlags()` reads from this cached map (flags change only on redeployment).
- In **non-prod** environments, flags are re-fetched from the database on every Drools execution, allowing toggling without redeployment.
- The `dbFeature.flags.enable` and `dbFeature.flags.disable` application properties can override specific flags at startup (used for Helm-chart based toggling).

**Design guidance** (from HLD - Feature-Flagging of Rules):
- Place the `FeatureFlag` condition **first** in the `when` clause of every rule, for clarity and consistency.
- If a rule needs to behave differently based on a flag, create **two separate rules** (one enabled, one disabled by the flag) rather than embedding conditional logic in a single rule.
- Periodically clean up flags that are permanently enabled in prod to prevent clutter and performance degradation.
<!-- CONFLUENCE-ONLY: periodic cleanup recommendation from HLD design page; no enforcement mechanism in source -->

## Register a new jurisdiction (if needed)

11. If the jurisdiction does not already exist, add its package to `src/main/resources/META-INF/kmodule.xml`:

```xml
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
                validationrules.probate,
                validationrules.{newjur}">
    <ksession name="org-role-mapping-validation-session" type="stateless"/>
</kbase>
```

Current jurisdictions in source: `iac`, `sscs`, `civil`, `privatelaw`, `publiclaw`, `employment`, `stcic`, `hrs`, `probate` (plus `core`).

12. Create the directory `src/main/resources/validationrules/{newjur}/` and add your `.drl` files.

## Deprecate an existing rule

13. Do not delete obsolete rules immediately. Instead, add a negative `FeatureFlag` guard to block execution. The pattern uses the newer flag to disable the old rule -- when the new flag is enabled, the old rule becomes unreachable:

```drool
/*
 * Made obsolete in COT-905 - disabled by CIVIL_WA_2_1 flag.
 * To be removed in DTSAM-591.
 */
rule "civil_judge_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_1_0.getValue())
  $f2: FeatureFlag(status == false, flagName == FeatureFlagEnum.CIVIL_WA_2_1.getValue())
  $joh: JudicialOfficeHolder(office in ("CIVIL District Judge-Salaried", ...))
then
   // ... original action
end;
```

The two-flag pattern works as follows:
- `$f` (positive guard): the old flag must be enabled (it already is in all environments).
- `$f2` (negative guard): the **new replacement flag** must be **disabled**. Once the new flag is enabled in an environment, this rule stops firing there.

This allows gradual rollout: the new rule fires where the new flag is on, the old rule fires where it's still off. Once the new flag is enabled everywhere, create a follow-up ticket to physically remove the dead rule.

Add a comment in the rule's doc-block noting the ticket that obsoleted it and the ticket that will remove it (e.g. `Made obsolete in COT-905 - To be removed in DTSAM-591`).

## Write a multi-region rule (if needed)

Some jurisdictions (e.g. Civil) require judicial roles assigned in one region to be cloned to another. This uses `cloneNewRoleAssignmentAndChangeRegion` in a separate `{jur}-multi-region.drl` file. The `not RoleAssignment(...)` clause prevents duplication. See `civil-multi-region.drl` for the full pattern.

## Understand the role refresh requirement

Enabling a new feature flag requires a **role refresh** to recompute affected users' role assignments. ORM only processes users reactively (on CRD/JRD change events); existing users won't be re-evaluated unless a refresh is triggered.

The refresh is managed by `am-role-assignment-refresh-batch` and controlled by LaunchDarkly flags (`orm-refresh-role`, `orm-refresh-job-enable`). After enabling a new flag, coordinate with the AM team to trigger a refresh for the affected jurisdiction/user-type combination.
<!-- CONFLUENCE-ONLY: role refresh triggering process details from "HLD - Feature-Flagging of Rules"; refresh batch job orchestration not fully visible in ORM source -->

## Verify

14. Run the existing Drools integration tests to ensure your rule fires correctly:

```bash
cd apps/am/am-org-role-mapping-service
./gradlew test --tests "*{YourJurisdiction}*"
```

15. For a quick local smoke test using the testing-support endpoints (requires `testing.support.enabled=true` in your local config):

```bash
# Start ORM locally
./gradlew bootRun

# Send a test message simulating a CRD event
curl -X POST http://localhost:4098/am/testing-support/send2CrdTopic \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["<target-user-idam-id>"]}'
```

16. Verify the role assignment was created in RAS (running locally on port 4096):

```bash
curl http://localhost:4096/am/role-assignments/actors/<target-user-idam-id> \
  -H "Authorization: Bearer <token>" \
  -H "ServiceAuthorization: Bearer <s2s-token>"
```

Confirm the response contains a role assignment matching your new rule's `roleName`, `jurisdiction`, and attributes.

## Examples

### Caseworker mapping rule — Civil senior tribunal caseworker (real source)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-caseworker-mapping.drl
package validationrules.civil;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.RoleAssignment;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.ActorIdType;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.RoleCategory;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.RoleType;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.Classification;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.GrantType;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.CaseWorkerAccessProfile;
import uk.gov.hmcts.reform.orgrolemapping.util.JacksonUtils;
import java.util.HashMap;
import java.util.Map;
import com.fasterxml.jackson.databind.JsonNode;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.FeatureFlag;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.enums.FeatureFlagEnum;
import function uk.gov.hmcts.reform.orgrolemapping.domain.service.RequestMappingService.logMsg;

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

### Judicial office holder mapping — Stage 1 (Civil circuit judge salaried, real source)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-office-holder-mapping.drl
import uk.gov.hmcts.reform.orgrolemapping.domain.model.JudicialAccessProfile;
import uk.gov.hmcts.reform.orgrolemapping.domain.model.JudicialOfficeHolder;
import java.time.ZonedDateTime;
import function uk.gov.hmcts.reform.orgrolemapping.helper.AssignmentRequestBuilder.validateAuthorisation;

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

### Judicial org role mapping — Stage 2, salaried (Civil district judge, real source)

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

### Judicial org role mapping — Stage 2, fee-paid requiring a booking (Civil deputy district judge)

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
import uk.gov.hmcts.reform.orgrolemapping.domain.model.JudicialBooking;

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

### Flyway migration adding a new feature flag to flag_config (real source pattern)

```sql
// Source: apps/am/am-org-role-mapping-service/src/main/resources/db/migration/V1.10__employment_wa_base_flag_addition.sql
-- insert employment law base flag into flag_config table
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'local', 'employment', 'true');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'pr', 'employment', 'true');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'aat', 'employment', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'demo', 'employment', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'perftest', 'employment', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'ithc', 'employment', 'false');
INSERT INTO flag_config (flag_name, env, service_name, status) VALUES ('employment_wa_1_0', 'prod', 'employment', 'false');
```

Note: flags default to `false` in all deployed environments; they are enabled separately once the rules are deployed and tested. `local` and `pr` environments default to `true` to support development and PR test runs.

### kmodule.xml adding a new jurisdiction (real source)

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

Add the new jurisdiction package to the `packages` attribute to make its `.drl` files visible to the engine.

## See also

- [Drools Rules](../explanation/drools-rules.md) — conceptual explanation of ORM rule structure, stateless sessions, fact types, and the two-stage judicial mapping pattern
- [Org Role Mapping Flow](../explanation/org-role-mapping-flow.md) — the end-to-end flow showing where Drools rule evaluation sits within the ORM ASB-to-RAS pipeline
- [ORM API Reference](../reference/api-org-role-mapping.md) — ORM endpoint reference, feature flag tables, and `flag_config` database schema
- [Write Drools Validation Rules](write-drools-validation-rules.md) — the counterpart guide for adding RAS validation rules when a new role name needs to be approved
