require_relative 'boot'

require 'rails/all'

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module SampleApp
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 6.0

    # Include the authenticity token in remote forms.
    config.action_view.embed_authenticity_token_in_remote_forms = true

    # Phase 2 (Angular) dev setup: Angular runs on :4200, Rails on :3001, so
    # every legitimate API request's Origin (:4200) differs from Rails' own
    # host:port (:3001). Rails' default forgery_protection_origin_check
    # compares those and rejects the mismatch as if it were cross-site,
    # which it isn't here — it's our own dev-proxy split-port setup. The
    # actual CSRF defense (verifying the X-CSRF-Token against the session)
    # stays fully enabled; this only relaxes the secondary Origin==Host
    # check. Revisit if/when Angular and Rails are served from a single
    # origin in production (see specs/02-sessions.md Open Question 1).
    config.action_controller.forgery_protection_origin_check = false
  end
end
