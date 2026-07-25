# Graph Report - ./rails-src  (2026-07-24)

## Corpus Check
- Corpus is ~10,785 words - fits in a single context window. You may not need a graph.

## Summary
- 361 nodes · 304 edges · 105 communities (49 shown, 56 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.82)
- Token cost: 90,000 input · 6,641 output

## Community Hubs (Navigation)
- Models User
- Helpers Sessions Helper
- Package
- Models Relationship Test
- Bundle
- Readme
- Controllers Password Resets Controller
- Webpack Environment
- Integration Users Profile Test
- Test Helper
- Channels Application Cable Channel
- Channels Application Cable Connection
- Controllers Microposts Controller Test
- Controllers Users Controller Test
- Helpers Sessions Helper Test
- Integration Following Test
- Integration Microposts Interface Test
- Integration Password Resets Test
- Integration Users Edit Test
- Integration Users Index Test
- Integration Users Login Test
- Integration Users Signup Test
- Models Micropost Test
- Models User Test
- Helpers Users Helper
- Jobs Application Job
- Mailers Application Mailer
- Application
- Db Migrate 20190822013911 Create Users
- Db Migrate 20190822021835 Add Index To Users 
- Db Migrate 20190822031056 Add Password Digest
- Db Migrate 20190823000019 Add Remember Digest
- Db Migrate 20190823171209 Add Admin To Users
- Db Migrate 20190823175841 Add Activation To U
- Db Migrate 20190824013003 Add Reset To Users
- Db Migrate 20190824113338 Create Microposts
- Db Migrate 20190827011913 Create Active Stora
- Db Migrate 20190827030205 Create Relationship
- Application System Test Case
- Channels Application Cable Connection Test
- Controllers Account Activations Controller Te
- Controllers Relationships Controller Test
- Controllers Sessions Controller Test
- Controllers Static Pages Controller Test
- Fixtures Users Usersfixture
- Integration Site Layout Test
- Mailers User Mailer Test
- Helpers Account Activations Helper
- Helpers Microposts Helper
- Helpers Password Resets Helper
- Helpers Relationships Helper
- Helpers Static Pages Helper
- Javascript Channels Index
- Docker Compose Dockercompose
- Rubocop Copsconfig
- Assets Images Rails Railslogo
- Cable Actioncableconfig
- Locales De Delocale
- Locales En Enlocale
- Locales Es Eslocale
- Storage Storageconfig
- Webpacker Webpackerconfig
- Public 404 Errorpage
- Public 422 Errorpage
- Public 500 Errorpage
- Public Apple Touch Icon
- Public Apple Touch Icon Precomposed

## God Nodes (most connected - your core abstractions)
1. `User` - 37 edges
2. `UsersController` - 14 edges
3. `ApplicationController` - 11 edges
4. `PasswordResetsController` - 10 edges
5. `SessionsHelper` - 10 edges
6. `MicropostsController` - 6 edges
7. `StaticPagesController` - 6 edges
8. `SessionsController` - 5 edges
9. `ApplicationRecord` - 5 edges
10. `RelationshipsController` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Ruby on Rails Tutorial (Michael Hartl)` --conceptually_related_to--> `Michael Hartl (author/copyright holder)`  [INFERRED]
  README.md → LICENSE.md
- `UsersProfileTest` --mixes_in--> `ApplicationHelper`  [EXTRACTED]
  test/integration/users_profile_test.rb → app/helpers/application_helper.rb
- `Rails Tutorial Help page` --references--> `Ruby on Rails Tutorial (Michael Hartl)`  [EXTRACTED]
  HELP.md → README.md
- `README.md - Ruby on Rails Tutorial sample app` --references--> `LICENSE.md (MIT + Beerware)`  [EXTRACTED]
  README.md → LICENSE.md
- `docker-compose.yml - postgres + web services` --references--> `config/database.yml - database adapters per environment`  [EXTRACTED]
  docker-compose.yml → config/database.yml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **i18n locale files (de/en/es) sharing static_pages.home key structure** — config_locales_de_delocale, config_locales_en_enlocale, config_locales_es_eslocale [INFERRED 0.85]
- **Rails default static error pages sharing identical rails-default-error-page structure** — public_404_errorpage, public_422_errorpage, public_500_errorpage [INFERRED 0.95]
- **Rails per-environment (development/test/production) service configs** — config_cable_actioncableconfig, config_database_databaseconfig, config_storage_storageconfig, config_webpacker_webpackerconfig [INFERRED 0.75]

## Communities (105 total, 56 thin omitted)

### Community 0 - "Models User"
Cohesion: 0.08
Nodes (5): UsersController, UserMailer, User, Preview, UserMailerPreview

### Community 1 - "Helpers Sessions Helper"
Cohesion: 0.07
Nodes (7): AccountActivationsController, ApplicationController, Base, MicropostsController, SessionsController, StaticPagesController, SessionsHelper

### Community 2 - "Package"
Cohesion: 0.08
Nodes (25): bootstrap, jquery, dependencies, bootstrap, jquery, @rails/actioncable, @rails/activestorage, @rails/ujs (+17 more)

### Community 3 - "Models Relationship Test"
Cohesion: 0.12
Nodes (7): RelationshipsController, ApplicationRecord, Base, Micropost, Relationship, TestCase, RelationshipTest

### Community 4 - "Bundle"
Cohesion: 0.24
Nodes (5): activate_bundler(), activation_error_handling(), cli_arg_version(), invoked_as_script?(), load_bundler!()

### Community 5 - "Readme"
Cohesion: 0.22
Nodes (10): Rails Tutorial Help page, reference implementation of the sample app (github.com/mhartl/sample_app_6th_ed), Beerware License (Revision 42), LICENSE.md (MIT + Beerware), Michael Hartl (author/copyright holder), MIT License, JetBrains (fork maintainer), README.md - Ruby on Rails Tutorial sample app (+2 more)

### Community 7 - "Webpack Environment"
Cohesion: 0.22
Nodes (5): environment, { environment }, webpack, environment, environment

### Community 8 - "Integration Users Profile Test"
Cohesion: 0.29
Nodes (3): ApplicationHelper, IntegrationTest, UsersProfileTest

### Community 10 - "Channels Application Cable Channel"
Cohesion: 0.50
Nodes (3): ApplicationCable, Channel, Base

### Community 11 - "Channels Application Cable Connection"
Cohesion: 0.50
Nodes (3): ApplicationCable, Connection, Base

### Community 44 - "Fixtures Users Usersfixture"
Cohesion: 0.67
Nodes (3): test/fixtures/microposts.yml - micropost test data, test/fixtures/relationships.yml - follower/followed test data, test/fixtures/users.yml - user test data

## Knowledge Gaps
- **46 isolated node(s):** `AccountActivationsHelper`, `MicropostsHelper`, `PasswordResetsHelper`, `RelationshipsHelper`, `StaticPagesHelper` (+41 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **56 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Models User` to `Helpers Sessions Helper`, `Models Relationship Test`, `Controllers Password Resets Controller`, `Models User Test`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ApplicationController` connect `Helpers Sessions Helper` to `Models User`, `Models Relationship Test`, `Controllers Password Resets Controller`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `UsersController` connect `Models User` to `Helpers Sessions Helper`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `AccountActivationsHelper`, `MicropostsHelper`, `PasswordResetsHelper` to the rest of the system?**
  _46 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Models User` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Helpers Sessions Helper` be split into smaller, more focused modules?**
  _Cohesion score 0.07058823529411765 - nodes in this community are weakly interconnected._
- **Should `Package` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._