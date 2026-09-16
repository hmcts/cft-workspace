---
title: Jenkins agents
topic: jenkins-agents
diataxis: how-to
product: workspace
audience: both
---
# Jenkins agents

The common pipeline is executed on Jenkins agents. These are the machines that run the pipeline stages and execute the tasks defined in the Jenkinsfile.

For security purposes, Jenkins agents have only the minimum necessary permissions to perform their tasks.

Jenkins agents will have access to a single environment so a pipeline may use multiple agents to deploy to different environments.

![Multiple agent pipeline](../../images/env-split-common-pipeline.png)

For pipelines that only target a single environment, a single agent will be used.

![Single agent pipeline](../../images/single-env-common-pipeline.png)

## Gradle build caching

Gradle's own build cache (`org.gradle.caching`) is not enabled by default in CNP Java pipelines — it has to be set in the repo's `gradle.properties`. It's worth enabling: when `BUILD_AGENT_CONTAINER` isn't set, the pipeline falls back to "Using VM agent" — one shared pod/workspace for the whole build rather than a fresh container per stage — so `GRADLE_USER_HOME` (and therefore the build cache, once turned on) persists across every Gradle invocation within a single Jenkins build. Adding `org.gradle.caching=true` alone, with no library or infrastructure change, can turn a later repeat of a task like `clean test` in the same build from tens of seconds to a few seconds.
