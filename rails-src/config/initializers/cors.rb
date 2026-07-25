# Phase 7 (Cutover): Rails is now a pure JSON API — in dev, Angular (:4200)
# reaches Rails (:3001) via proxy.conf.json, so same-origin rules never
# applied there. In production Angular and Rails are expected to be served
# from different origins, so CORS must be explicit. ANGULAR_ORIGIN is the
# production Angular deployment's origin (e.g. "https://app.example.com");
# credentials: true is required because auth uses the cookie+CSRF transport
# (specs/02-sessions.md Open Question 1), so "*" is never a valid origin here.
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch('ANGULAR_ORIGIN', 'http://localhost:4200')
    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :patch, :put, :delete, :options],
      credentials: true
  end
end
