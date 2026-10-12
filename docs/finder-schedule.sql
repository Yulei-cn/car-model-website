-- Optional: enable pg_cron and pg_net in Supabase first.
-- Create Vault secret car_finder_cron_secret with the same value as Vercel CRON_SECRET.
-- Running this again updates the named job instead of creating another schedule.
select cron.schedule(
  'car-model-finder-every-5-minutes',
  '*/5 * * * *',
  $$
    select net.http_get(
      url := 'https://car-model-website-smoky.vercel.app/api/finder-cron',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'car_finder_cron_secret')
      ),
      timeout_milliseconds := 60000
    );
  $$
);
