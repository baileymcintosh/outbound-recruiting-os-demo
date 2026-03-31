insert into public.contacts
  (full_name, firm, "group", role, location, school, email, email_confidence_score, linkedin_url, tags)
values
  ('Alex Kim', 'Centerview Partners', 'Investment Banking', 'Analyst', 'New York, NY', 'Wharton', 'alex.kim@example.com', 0.94, 'https://linkedin.com/in/alex-kim-cv', '{"wharton","ib"}'),
  ('Maya Patel', 'Evercore', 'M&A', 'Analyst', 'New York, NY', 'Wharton', 'maya.patel@example.com', 0.91, 'https://linkedin.com/in/maya-patel-evr', '{"wharton","m&a"}'),
  ('Jordan Lee', 'Moelis', 'Technology', 'Associate', 'San Francisco, CA', 'Penn', 'jordan.lee@example.com', 0.89, 'https://linkedin.com/in/jordan-lee-moelis', '{"penn","tech"}'),
  ('Sophie Chen', 'Goldman Sachs', 'Healthcare', 'Analyst', 'New York, NY', 'Wharton', 'sophie.chen@example.com', 0.97, 'https://linkedin.com/in/sophie-chen-gs', '{"wharton","healthcare"}'),
  ('Noah Stein', 'Lazard', 'Restructuring', 'Analyst', 'Chicago, IL', 'Penn', 'noah.stein@example.com', 0.9, 'https://linkedin.com/in/noah-stein-lazard', '{"penn","rx"}'),
  ('Ethan Park', 'Centerview Partners', 'Investment Banking', 'Analyst', 'New York, NY', 'Wharton', 'ethan.park@example.com', 0.95, 'https://linkedin.com/in/ethan-park-cv', '{"wharton","ib"}'),
  ('Olivia Ross', 'PJT Partners', 'Strategic Advisory', 'Analyst', 'New York, NY', 'Wharton', 'olivia.ross@example.com', 0.92, 'https://linkedin.com/in/olivia-ross-pjt', '{"wharton","advisory"}'),
  ('Daniel Wu', 'Morgan Stanley', 'M&A', 'Analyst', 'New York, NY', 'Penn', 'daniel.wu@example.com', 0.93, 'https://linkedin.com/in/daniel-wu-ms', '{"penn","m&a"}')
on conflict do nothing;
