ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __dir__)

# Env-compat: Ruby 3.1 + Rails 6.1 load-order issue — ActiveSupport expects
# the stdlib Logger constant to already exist when bootsnap pulls it in.
require 'logger'
require 'bundler/setup' # Set up gems listed in the Gemfile.
require 'bootsnap/setup' # Speed up boot time by caching expensive operations.
