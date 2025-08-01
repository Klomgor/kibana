# Cypress Tests

The `security_solution/cypress/e2e/ai4dsoc` directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/).

Currently with Cypress you can develop `functional` tests.

## Table of Contents

[**How to add a new Cypress test**](#how-to-add-a-new-cypress-test)

[**Running the tests**](#running-the-tests)

[**Enabling Experimental Flags**](#enabling-experimental-flags)

[**Debugging your test**](#debugging-your-test)

[**Folder structure**](#folder-structure)

[**Test data**](#test-data)

[**Serverless**](#serverless)

[**Development Best Practices**](#development-best-practices)

[**Test Artifacts**](#test-artifacts)

[**Linting**](#linting)

## How to add a new Cypress test

Before considering adding a new Cypress tests, please make sure you have added unit and API tests first. Note that, the aim of Cypress
is to test that the user interface operates as expected, hence, you should not be using this tool to test REST API or data contracts.

First take a look to the [**Development Best Practices**](#development-best-practices) section.
Then check [**Folder structure**](#folder-structure) section to know where is the best place to put your test, [**Test data**](#test-data) section if you need to create any type
of data for your test, [**Running the tests**](#running-the-tests) to know how to execute the tests and [**Debugging your test**](#debugging-your-test) to debug your test if needed.

Please, before opening a PR with the new test, please make sure that the test fails. If you never see your test fail you don’t know if your test is actually testing the right thing, or testing anything at all.

Note that we use tags in order to select which tests we want to execute:

- `@serverless` includes a test in the Serverless test suite for PRs (the so-called first quality gate) and QA environment for the periodic pipeline. You need to explicitly add this tag to any test you want to run in CI for serverless.

## Running the tests

### Run them locally

When running the tests, FTR is used to spawn both a Kibana instance (http://localhost:5620) and an Elasticsearch instance (http://localhost:9220) with a preloaded minimum set of data (see preceding "Test data" section).

Run the tests with the following yarn scripts from `x-pack/test/security_solution_cypress`:

| Script Name                     | Description                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cypress:open:ai4dsoc:serverless | Opens the Cypress UI with all tests in the `e2e/aid4soc` directory. This also runs a mocked serverless environment using the `ai_soc` pruduct line and `search_ai_lake` tier by default. |
| cypress:run:ai4dsoc:serverless  | Runs all tests tagged as SERVERLESS in the `e2e/ai4dsoc` directory in headless mode using the `ai_soc` pruduct line and `search_ai_lake` tier by default.                                |

Please note that the headless mode command do not open the Cypress UI and are typically used in CI/CD environments. The scripts that open the Cypress UI are useful for development and debugging.

### Enabling experimental flags

When writing a test that requires an experimental flag enabled, you need to pass an extra configuration to the header of the test:

```typescript
describe(
  'My Experimental Flag test',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify(['MY_EXPERIMENTAL_FLAG'])}`,
        ],
      },
    },
  }
  // ...
);
```

Note that this configuration doesn't work for local test development as well as MKI test execution. For local testing and deugginb, you need to update the configuration file: `../ai4dsoc_serverless_config`, but you shouldn't commit these changes.

## Debugging your test

In order to be able to debug any Cypress test you need to open Cypress on visual mode. [Here](https://docs.cypress.io/guides/guides/debugging)
you can find an extended guide about how to proceed.

If you are debugging a flaky test, a good tip is to insert a `cy.wait(<some long milliseconds>)` around async parts of the tes code base, such as network calls which can make an indeterministic test, deterministically fail locally.

## Folder Structure

Below you can find the folder structure used on our Cypress tests.

### e2e/

Cypress convention starting version 10 (previously known as integration). Contains the specs that are going to be executed.

### AI4DSOC team folder

All the tests belonging to the AI4DSOC effort should be added to this folder since is the only one that executes the AI4DSOC specific tier by default.

### fixtures/

Cypress convention. Fixtures are used as external pieces of static data when we stub responses.

### plugins/

Cypress convention. As a convenience, by default Cypress will automatically include the plugins file cypress/plugins/index.js before every single spec file it runs.

### objects/

Contains representations of data used across different tests; our domain objects.

### screens/

Contains the elements we want to interact with in our tests.

Each file inside the screens folder represents a screen in our application. When the screens are complex, e.g. Hosts with its multiple tabs, the page is represented by a folder and the different important parts are represented by files.

Example:

- screens
  - hosts
    - all_hosts.ts
    - authentications.ts
    - events.ts
    - main.ts
    - uncommon_processes.ts

### tasks/

_Tasks_ are functions that may be reused across tests.

Each file inside the tasks folder represents a screen of our application. When the screens are complex, e.g. Hosts with its multiple tabs, the page is represented by a folder and the different important parts are represented by files.

Example:

- tasks
  - hosts
    - all_hosts.ts
    - authentications.ts
    - events.ts
    - main.ts
    - uncommon_processes.ts

### urls/

Represents all the URLs used during the tests execution.

## Test data

The data the tests need:

- Is generated on the fly using our application APIs (preferred way)
- Is ingested on the ELS instance using the `es_archiver` utility

By default, when running the tests in Jenkins mode, a base set of data is ingested on the ELS instance: a set of auditbeat data (the `auditbeat` archive). This is usually enough to cover most of the scenarios that we are testing.

### How to generate a new archive

**Note:** As mentioned above, archives are only meant to contain external data, e.g. beats data. Due to the tendency for archived domain objects (rules, signals) to quickly become out of date, it is strongly suggested that you generate this data within the test, through interaction with either the UI or the API.

We use es_archiver to manage the data that our Cypress tests need.

1. Set up a clean instance of kibana and elasticsearch (if this is not possible, try to clean/minimize the data that you are going to archive).
2. With the kibana and elasticsearch instance up and running, create the data that you need for your test.
3. When you are sure that you have all the data you need run the following command from: `x-pack/test/security_solution_cypress`

```sh
node ../../../scripts/es_archiver save <nameOfTheFolderWhereDataIsSaved> <indexPatternsToBeSaved>  --dir ../../test/security_solution_cypress/es_archives --config ../../../src/platform/test/functional/config.base.js --es-url http://<elasticsearchUsername>:<elasticsearchPassword>@<elasticsearchHost>:<elasticsearchPort>
```

Example:

```sh
node ../../../scripts/es_archiver save custom_rules ".kibana",".siem-signal*"  --dir ../../test/security_solution_cypress/es_archives --config ../../../src/platform/test/functional/config.base.js --es-url http://elastic:changeme@localhost:9220
```

Note that the command will create the folder if it does not exist.

### Using an archive from within the Cypress tests

Task [cypress/support/es_archiver.ts](https://github.com/elastic/kibana/blob/main/x-pack/test/security_solution_cypress/cypress/support/es_archiver.ts) provides helpers such as `esArchiverLoad` and `esArchiverUnload` by means of `es_archiver`'s CLI.

Archives used only for Cypress tests purposes are stored in `x-pack/test/security_solution_cypress/es_archives` and are used as follow on the tests.

```typescript
cy.task('esArchiverLoad', { archiveName: 'overview' });
cy.task('esArchiverUnload', { archiveName: 'overview' });
```

You can also use archives located in `x-pack/solutions/security/test/fixtures/es_archives/security_solution` by specifying `type: 'ftr'` in the archiver tasks:

```typescript
// loads then unloads from x-pack/solutions/security/test/fixtures/es_archives/security_solution/alias
cy.task('esArchiverLoad', { archiveName: 'alias', type: 'ftr' });
cy.task('esArchiverUnload', { archiveName: 'alias', type: 'ftr' });
```

## Serverless

Note that we use tags in order to select which tests we want to execute in the different pipelines, AI4DSOC should have the following labels:

`@serverless` as mandatory label.
`@serverlessQA` for the tests that we want to execute as part of the Kibana QA quality gate.

#### PLIs

When running AI4DSOC Cypress tests, the following PLI is set by default:

```
   { product_line: 'ai_soc', product_tier: 'search_ai_lake' }
```

#### Custom Roles

Custom roles for serverless is currently supported only for stateless environments (non MKI environments).

##### Creating a Custom Role

To create a custom role, use the Cypress task `createServerlessCustomRole`. This task requires two parameters:

- **`roleDescriptor`**: Defines the permissions and access for the role.
- **`roleName`**: A unique name for the custom role.

Example:

```typescript
const roleDescriptor = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

cy.task('createServerlessCustomRole', { roleDescriptor, roleName: 'customRole' });
```

##### Using a Custom Role

Once the custom role is created, you can log in to the application using your regular `login`` method and passing the name of the role.

```typescript
login('customRole');
```

##### Deleting a Custom Role

After your tests, always delete the custom role to ensure a clean environment. Use the `deleteServerlessCustomRole` task and provide the name of the role as the parameter.

```typescript
cy.task('deleteServerlessCustomRole', 'customRole');
```

##### Full workflow

Here’s the complete workflow for creating, using, and deleting a custom role:

```typescript
const roleDescriptor = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

before(() => {
  cy.task('createServerlessCustomRole', { roleDescriptor, roleName: 'customRole' });
});

beforeEach(() => {
  login('customRole');
});

after(() => {
  cy.task('deleteServerlessCustomRole', 'customRole');
});
```

## Development Best Practices

Below you will a set of best practices that should be followed when writing Cypress tests.

### Avoid forced actions

Cypress action commands like `click()`, `type()` and etc allow to pass `force` flag which is set to `false` by default. Avoid passing the `force` flag as it leads to swallowing some UI bugs. If it's impossible to perform an action without forcing it make sure to add an explanation comment and create a ticket to don't forget to fix it later on. The same is applicable to adding an extra `click()` before `type()` command. `type()` clicks an input once and types after so an extra `click()` usually means there is a problem.

### Write easy to maintain tests

Consider to extract all the elements you need to interact with to the `screens` folder. In this way in case the locator changes, we just need to update the value in one place.

### Write easy to read tests

Consider to extract all the tasks a user should perfom into the `tasks` folder. In this way is going to be easier to undertsand what are we trying to mimic from the user perspective. Also in case there is change on the way the user has to perform the action, we just need to update the value in one place.

### Make sure your test fails

Before open a PR with a new test, please first make sure that the test fails. If you never see your test fail you don’t know if your test is actually testing the right thing, or testing anything at all.

### Minimize the use of es_archive

When possible, create all the data that you need for executing the tests using the application APIS or the UI.

## Test Artifacts

When Cypress tests are run headless on the command line, artifacts
are generated under the `target` directory in the root of Kibana as follows:

- HTML Reports
  - location: `target/kibana-security-solution/cypress/results/output.html`
- `junit` Reports
  - location: `target/kibana-security-solution/cypress/results`
- Screenshots (of failed tests)
  - location: `target/kibana-security-solution/cypress/screenshots`
- Videos
  - disabled by default, can be enabled by setting env var `CYPRESS_video=true`
  - location: `target/kibana-security-solution/cypress/videos`

## Linting

Optional linting rules for Cypress and linting setup can be found [here](https://github.com/cypress-io/eslint-plugin-cypress#usage)
