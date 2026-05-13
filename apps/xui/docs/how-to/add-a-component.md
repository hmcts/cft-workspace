---
title: Add A Component
topic: toolkit
diataxis: how-to
product: xui
audience: both
sources:
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/public-api.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/ng-package.json
  - ccd-case-ui-toolkit:angular.json
  - ccd-case-ui-toolkit:package.json
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/package.json
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.module.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.service.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/domain/definition/field-type-enum.model.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/domain/definition/display-context-enum.model.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/abstract-field-write.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/abstract-field-read.component.ts
  - ccd-case-ui-toolkit:projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/base-field/abstract-field-write-journey.component.ts
  - ccd-case-ui-toolkit:.github/workflows/npmpublish.yml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/xui/ccd-case-ui-toolkit/projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.service.ts
confluence:
  - id: "1682837411"
    title: "ccd-case-ui-toolkit Release Process"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1317863756"
    title: "Release and npm publish process for ccd-case-ui-toolkit"
    last_modified: "unknown"
    space: "EUI"
  - id: "1471087572"
    title: "Making a pre-release version of ccd-case-ui-toolkit"
    last_modified: "unknown"
    space: "EUI"
  - id: "1875864287"
    title: "Summary for KT session 13th August 2025"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1572574739"
    title: "Expert UI - Low Level Design - Link/Unlink Cases"
    last_modified: "unknown"
    space: "EUI"
  - id: "1329660520"
    title: "Expert UI - Low Level Design - Case File View"
    last_modified: "unknown"
    space: "EUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- New components live under `projects/ccd-case-ui-toolkit/src/lib/shared/components/` (or `.../palette/` for field renderers).
- Every component must be declared in the appropriate NgModule, exported from `public-api.ts`, and tested with a `.spec.ts` file.
- The library is NgModule-based (`standalone: false`) -- all components follow this pattern.
- Two registration paths: **switch-statement** (for standard field types) and **ComponentLauncher registry** (for advanced multi-page components like Case Linking, Case Flags, Query Management).
- Publishing: update version in **both** `package.json` files, then create a GitHub Release; CI auto-publishes to npm.
- Consuming apps (`rpx-xui-webapp`, `rpx-xui-manage-organisations`, `rpx-xui-approve-org`) pick up the new version by updating their `package.json` dependency pin.

## Prerequisites

- Node.js and Yarn installed (matching the repo's `.nvmrc`; currently Node >= 20.19.0).
- The `ccd-case-ui-toolkit` repo cloned and dependencies installed (`yarn install`).
- Familiarity with the Angular workspace layout: the demo app lives in `src/`, the publishable library lives in `projects/ccd-case-ui-toolkit/`.

## 1. Create the component files

Create a new directory under the library's component tree. For a general UI component:

```
projects/ccd-case-ui-toolkit/src/lib/shared/components/<your-component>/
```

For a field-type renderer (palette component):

```
projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/<your-field>/
```

At minimum, create:

```
<your-component>.component.ts
<your-component>.component.html
<your-component>.component.spec.ts
```

Use the selector prefix `ccd-` (the `angular.json` declares prefix `xuilib` for CLI schematics, but existing components all use `ccd-`). For example:

```typescript
@Component({
  selector: 'ccd-my-widget',
  templateUrl: './my-widget.component.html',
  standalone: false
})
export class MyWidgetComponent {
  // ...
}
```

All toolkit components use `standalone: false`. Do not create standalone components.

## 2. Choose the correct base class

The toolkit provides three base classes for palette field components:

| Base class | Use case |
|---|---|
| `AbstractFieldWriteComponent` | Standard write-mode field (single page, form-integrated) |
| `AbstractFieldReadComponent` | Standard read-mode field (accepts `PaletteContext` for context-aware rendering) |
| `AbstractFieldWriteJourneyComponent` | Multi-page write-mode component with internal navigation (e.g. Case Flags, Case Linking) |

`AbstractFieldReadComponent` provides a `context` input that can be `DEFAULT`, `CHECK_YOUR_ANSWER`, or `TABLE_VIEW` (`PaletteContext` enum). Use this to vary rendering in Check Your Answers pages.

`AbstractFieldWriteJourneyComponent` extends `AbstractFieldWriteComponent` and adds a page-based journey model with `next()`, `previous()`, `hasNext()`, `hasPrevious()`, and automatic state persistence via `MultipageComponentStateService`. Use this when your component needs internal multi-step navigation within a single event page.

## 3. Declare and export in the owning NgModule

Add the component to the appropriate NgModule's `declarations` and `exports` arrays.

- General components: the relevant module in `projects/ccd-case-ui-toolkit/src/lib/shared/components/` (e.g. `CaseEditorModule` for wizard-related components).
- Field renderers: `projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.module.ts` -- this module declares all palette components.

```typescript
// palette.module.ts (example for a field renderer)
@NgModule({
  declarations: [
    // ... existing components
    WriteMyFieldComponent,
    ReadMyFieldComponent,
  ],
  exports: [
    // ... existing exports
    WriteMyFieldComponent,
    ReadMyFieldComponent,
  ],
})
export class PaletteModule {}
```

For complex multi-module components (e.g. Case File View), create a dedicated NgModule within your component directory. Import that module into `palette.module.ts`. Use the ngRx store pattern (actions, effects, selectors) if the component has multiple interacting sub-components that share state.
<!-- CONFLUENCE-ONLY: not verified in source -->

## 4. Register in PaletteService

Registration depends on whether your component is a **standard field type** or a **ComponentLauncher component**.

### Standard field types (switch statement)

For a new CCD base field type, add a case to the `switch` statement in `getFieldComponentClass()` within `palette.service.ts`:

```typescript
case 'MyNewFieldType':
  return write ? WriteMyFieldComponent : ReadMyFieldComponent;
```

Also add the new type identifier to `FieldTypeEnum` in `field-type-enum.model.ts`:

```typescript
export type FieldTypeEnum =
  'Text'
  | 'TextArea'
  // ... existing types
  | 'MyNewFieldType';
```

The current supported types in the switch statement are: `Text`, `Postcode`, `TextArea`, `Number`, `YesOrNo`, `Email`, `PhoneUK`, `Date`, `DateTime`, `MoneyGBP`, `DynamicList`, `FixedList`, `DynamicRadioList`, `DynamicMultiSelectList`, `FixedRadioList`, `Complex` (with sub-dispatch for `AddressGlobalUK`, `AddressUK`, `OrderSummary`, `CaseLink`, `Organisation`, `JudicialUser`), `Collection`, `MultiSelectList`, `Document`, `Label`, `CasePaymentHistoryViewer`, `CaseHistoryViewer`, `WaysToPay`, `ComponentLauncher`, and `FlagLauncher`.

If the field type is not registered, `PaletteService` returns `UnsupportedFieldComponent` and the field renders as blank with no error.

### ComponentLauncher components (registry)

For advanced components that should be launched via the `ComponentLauncher` CCD base type (the preferred approach for new multi-page features), register in the `componentLauncherRegistry` at the top of `PaletteService`:

```typescript
private readonly componentLauncherRegistry = {
  [DisplayContextCustomParameter.CaseFileView]: [CaseFileViewFieldComponent, CaseFileViewFieldComponent],
  [DisplayContextCustomParameter.LinkedCases]: [WriteLinkedCasesFieldComponent, ReadLinkedCasesFieldComponent],
  [DisplayContextCustomParameter.QueryManagement]: [ReadQueryManagementFieldComponent, ReadQueryManagementFieldComponent],
  // Add your component:
  [DisplayContextCustomParameter.MyFeature]: [WriteMyFeatureComponent, ReadMyFeatureComponent],
};
```

Then add the identifier to `DisplayContextCustomParameter` in `display-context-enum.model.ts`:

```typescript
export enum DisplayContextCustomParameter {
  CaseFileView = 'CaseFileView',
  LinkedCases = 'LinkedCases',
  QueryManagement = 'QueryManagement',
  MyFeature = 'MyFeature',
}
```

The registry array is `[WriteComponent, ReadComponent]`. Services configure this in their CCD definition by using the `ComponentLauncher` field type with a `display_context_parameter` of `#ARGUMENT(MyFeature)`. The palette service extracts the argument value and looks it up in the registry.

This approach avoids extending the main switch statement and is the recommended pattern for new feature components that are not basic field renderers.

## 5. Export from public-api.ts

Add your component (and any associated models/services) to the library's public entry point:

```
projects/ccd-case-ui-toolkit/src/public-api.ts
```

This file re-exports from barrel files (`./lib/components`, `./lib/shared`). Either add a direct export or ensure your component is exported through the existing barrel chain. If it is declared in a module that already re-exports through `./lib/shared`, confirm the barrel at that level includes your new file.

Without this step, consuming apps cannot import your component -- ng-packagr only bundles symbols reachable from `public-api.ts` (`ng-package.json:1-10`).

## 6. Write tests

Create a `.spec.ts` file alongside your component. The toolkit uses Jasmine with Karma. Shared test fixtures live in `projects/ccd-case-ui-toolkit/src/lib/shared/fixture/`.

```typescript
describe('MyWidgetComponent', () => {
  let component: MyWidgetComponent;
  let fixture: ComponentFixture<MyWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MyWidgetComponent],
      imports: [/* required modules */],
    }).compileComponents();

    fixture = TestBed.createComponent(MyWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

If your component needs Welsh translation support, import `RpxTranslationModule` in the test module.

Note: Toolkit releases have historically introduced regressions that automated tests did not catch. The team requires Service Regression Testing (SRT) for higher-risk changes. Write thorough tests covering edge cases to avoid triggering an SRT cycle on your release.
<!-- CONFLUENCE-ONLY: not verified in source -->

## 7. Build and verify locally

```bash
# Run tests (must pass before version bump)
yarn test

# Build the library
yarn build:library
```

This invokes `ng build ccd-case-ui-toolkit-lib` which runs ng-packagr, producing output in `dist/ccd-case-ui-toolkit/` with FESM2022, UMD, and ESM bundles plus type definitions (`angular.json:113-130`).

## 8. Publish a new version

### Version numbering

You must update the version in **both** package.json files -- they must match:

- Root: `package.json` (currently `7.3.52`)
- Library: `projects/ccd-case-ui-toolkit/package.json` (currently `7.3.52`)

<!-- DIVERGENCE: Confluence says "the preversion hook runs lint, test, and build automatically" and the draft says "npm version patch" triggers this. While the preversion hook does exist in package.json:38 (it runs "npm run ci" which is lint+test+build), the actual publish mechanism is GitHub Actions triggered by a GitHub Release event, not by the postversion hook pushing a tag. The postversion hook pushes to master, but publishing only happens when you create a Release on GitHub. Source wins. -->

Version numbers follow [semver](https://semver.org/) with the convention:
- Feature team releases: bump the **minor** version (e.g. `7.4.0`)
- PET team / patch releases: bump the **patch** version (e.g. `7.3.53`)
- Pre-releases: append a label (e.g. `7.4.0-fix-link-defect` or `7.4.0-alpha`)

### Publishing workflow

1. Merge your PR to `master` with the updated version numbers.
2. Go to <https://github.com/hmcts/ccd-case-ui-toolkit/releases/new>.
3. Create a new tag of the form `v<version>` (e.g. `v7.3.53`) targeting `master`.
4. Enter the release title (the version number) and a brief description of changes.
5. For a **full release**: leave "This is a pre-release" unchecked. The GitHub Action publishes to npm with the `latest` dist-tag.
6. For a **pre-release**: check "This is a pre-release". The GitHub Action publishes to npm with the `next` dist-tag.

The `npmpublish.yml` GitHub Action handles the actual npm publish using OIDC Trusted Publishing (no token required). It also attaches the tarball to the GitHub Release. Monitor progress at <https://github.com/hmcts/ccd-case-ui-toolkit/actions>.

### Release checklist (from team process)

Before publishing:
- [ ] Both `package.json` files updated to the same new version
- [ ] `RELEASE-NOTES.md` updated with version, date, and summary of changes
- [ ] All tests passing (`yarn test`)
- [ ] PR reviewed and merged to `master`

### Pre-release from a feature branch

You can publish a pre-release from any branch (not just master):

1. Tag your branch: `git tag v7.3.53-my-feature && git push origin v7.3.53-my-feature`
2. Create a GitHub Release targeting your branch, with the pre-release checkbox selected.
3. The Action builds from that branch and publishes with the `next` dist-tag.

This is useful for testing toolkit changes in consuming apps before merging.

## 9. Update consuming apps

In each consuming app (`rpx-xui-webapp`, `rpx-xui-manage-organisations`, `rpx-xui-approve-org`), update the dependency version:

```json
{
  "dependencies": {
    "@hmcts/ccd-case-ui-toolkit": "7.3.53"
  }
}
```

Then import the relevant NgModule in the consuming app's feature module:

```typescript
import { PaletteModule } from '@hmcts/ccd-case-ui-toolkit';

@NgModule({
  imports: [PaletteModule],
})
export class MyFeatureModule {}
```

Consuming apps must also provide `AbstractAppConfig` -- the library resolves all backend URLs through this DI token at runtime. If your new component needs a new URL accessor, add it to the `AbstractAppConfig` abstract class and update the concrete implementations in each consuming app.

### Service Regression Testing (SRT)

For higher-risk toolkit changes, the team may require an SRT window before the consuming app merges the version bump. During SRT:
- A `rpx-xui-webapp` PR is raised pointing to the pre-release toolkit version.
- The QA team and affected service teams test their journeys on the PR environment.
- Each service signs off before the final merge.

Low-risk changes (e.g. isolated bug fixes with comprehensive test coverage) may skip SRT and go CI/CD.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Verify

1. After building locally (`yarn build:library`), confirm your component appears in `dist/ccd-case-ui-toolkit/index.d.ts`.
2. Run `yarn test` and confirm all specs pass (the `preversion` hook enforces this anyway).
3. After publishing, in a consuming app run `yarn install` and verify the component is importable:

```typescript
import { MyWidgetComponent } from '@hmcts/ccd-case-ui-toolkit';
```

4. If adding a field renderer, create a test case definition with the new `FieldTypeEnum` value and confirm the wizard renders it in read and write modes.
5. If adding a ComponentLauncher component, configure a test field with `ComponentLauncher` type and `#ARGUMENT(MyFeature)` in the display context parameter.

## Examples

### Real `PaletteService` structure — showing the componentLauncherRegistry and dispatch switch

```typescript
// Source: apps/xui/ccd-case-ui-toolkit/projects/ccd-case-ui-toolkit/src/lib/shared/components/palette/palette.service.ts

@Injectable()
export class PaletteService {
  // ComponentLauncher registry: [WriteComponent, ReadComponent] per #ARGUMENT(...) key
  private readonly componentLauncherRegistry = {
    [DisplayContextCustomParameter.CaseFileView]:    [CaseFileViewFieldComponent,       CaseFileViewFieldComponent],
    [DisplayContextCustomParameter.LinkedCases]:     [WriteLinkedCasesFieldComponent,   ReadLinkedCasesFieldComponent],
    [DisplayContextCustomParameter.QueryManagement]: [ReadQueryManagementFieldComponent, ReadQueryManagementFieldComponent],
    // Add your component here:
    // [DisplayContextCustomParameter.MyFeature]: [WriteMyFeatureComponent, ReadMyFeatureComponent],
  };

  public getFieldComponentClass(caseField: CaseField, write: boolean): Type<{}> {
    switch (caseField.field_type.type) {
      case 'Text':
      case 'Postcode':
        return write ? WriteTextFieldComponent : ReadTextFieldComponent;
      // ... other cases ...
      case 'ComponentLauncher':
        return this.getComponentLauncherComponent(caseField, write);
      case 'FlagLauncher':
        return write ? WriteCaseFlagFieldComponent : ReadCaseFlagFieldComponent;
      default:
        return UnsupportedFieldComponent;  // unknown types fail silently
    }
  }

  // Extracts value from #ARGUMENT(X) in display_context_parameter, strips standard DisplayContextParameter
  // entries, then looks up the remainder in componentLauncherRegistry
  private getComponentLauncherComponent(caseField: CaseField, write: boolean): any {
    const argumentValue = caseField?.display_context_parameter?.match(/#ARGUMENT\((.*?)\)/)[1];
    if (argumentValue) {
      const componentToRender = (argumentValue.includes(',') ? argumentValue.split(',') : [argumentValue])
        .filter(p => !Object.values(DisplayContextParameter).includes(p as any));
      if (componentToRender.length > 0 && this.componentLauncherRegistry.hasOwnProperty(componentToRender[0])) {
        return this.componentLauncherRegistry[componentToRender[0]][write ? 0 : 1];
      }
    }
    return UnsupportedFieldComponent;
  }
}
```

The `write ? 0 : 1` index means the registry array is always `[WriteComponent, ReadComponent]`.

## See also

- [Explanation: Case UI Toolkit](../explanation/case-ui-toolkit.md) — how the wizard, field-type palette, conditional show, and ComponentLauncher architecture work
- [Explanation: Translation](../explanation/translation.md) — how to add `RpxTranslationModule.forChild()` to a new module for Welsh support
- [Reference: Shared Libraries](../reference/shared-libraries.md) — toolkit versioning, SRT process, and the inter-library dependency graph
- [How-to: Local Development](local-development.md) — using a local `yarn build:library:watch` + `link:` to test toolkit changes in Manage Cases
- [Glossary](../reference/glossary.md) — definitions of `ccd-case-ui-toolkit`, `ComponentLauncher`, `PaletteService`, `AbstractAppConfig`, and SRT
