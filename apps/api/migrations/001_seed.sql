-- Project
INSERT OR IGNORE INTO projects (id, name, slug, description) VALUES
  ('proj_figflag', 'FigFlag', 'figflag', 'Self-hosted feature flags');

-- Environments
INSERT OR IGNORE INTO environments (id, project_id, name, slug, description) VALUES
  ('env_dev', 'proj_figflag', 'Development', 'dev', 'Local development'),
  ('env_stg', 'proj_figflag', 'Staging', 'staging', 'Pre-production'),
  ('env_prd', 'proj_figflag', 'Production', 'prod', 'Live environment');

-- Flags (boolean)
INSERT OR IGNORE INTO flags (id, project_id, environment_id, key, name, description, enabled, default_value) VALUES
  ('flag_new_nav_dev',  'proj_figflag', 'env_dev', 'ui.newNavigation', 'New navigation', 'Roll out new nav', 1, NULL),
  ('flag_new_nav_stg',  'proj_figflag', 'env_stg', 'ui.newNavigation', 'New navigation', 'Roll out new nav', 1, NULL),
  ('flag_new_nav_prd',  'proj_figflag', 'env_prd', 'ui.newNavigation', 'New navigation', 'Roll out new nav', 0, NULL),

  ('flag_pay_beta_dev', 'proj_figflag', 'env_dev', 'payments.betaFlow', 'Payments beta', 'Test new checkout', 1, NULL),
  ('flag_pay_beta_stg', 'proj_figflag', 'env_stg', 'payments.betaFlow', 'Payments beta', 'Test new checkout', 1, NULL),
  ('flag_pay_beta_prd', 'proj_figflag', 'env_prd', 'payments.betaFlow', 'Payments beta', 'Test new checkout', 0, NULL);

-- Configs (JSON-encoded TEXT)
INSERT OR IGNORE INTO configs (id, project_id, environment_id, key, name, description, value) VALUES
  ('cfg_api_dev',  'proj_figflag', 'env_dev', 'api.baseUrl', 'API base URL', 'Per-env API URL', '"http://localhost:8787"'),
  ('cfg_api_stg',  'proj_figflag', 'env_stg', 'api.baseUrl', 'API base URL', 'Per-env API URL', '"https://staging.api.example.com"'),
  ('cfg_api_prd',  'proj_figflag', 'env_prd', 'api.baseUrl', 'API base URL', 'Per-env API URL', '"https://api.example.com"'),

  ('cfg_theme_dev','proj_figflag', 'env_dev', 'ui.theme', 'UI theme', 'Theme settings', '"dark"'),
  ('cfg_theme_prd','proj_figflag', 'env_prd', 'ui.theme', 'UI theme', 'Theme settings', '"light"'),

  ('cfg_exp_dev',  'proj_figflag', 'env_dev', 'exp.allocations', 'Experiment allocations', 'Buckets', 
    '{"experimentA":{"control":50,"variant":50}}'),
  ('cfg_exp_prd',  'proj_figflag', 'env_prd', 'exp.allocations', 'Experiment allocations', 'Buckets', 
    '{"experimentA":{"control":90,"variant":10}}');