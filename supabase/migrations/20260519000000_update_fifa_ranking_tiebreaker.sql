-- Updates the legacy draw_order column to store the FIFA/Coca-Cola Men's
-- World Ranking position used as the final FIFA tiebreaker.
insert into public.team_discipline (team_id, conduct_score, draw_order)
values
  ('MEX', null, 15),
  ('RSA', null, 60),
  ('KOR', null, 25),
  ('UEFA_D', null, 41),
  ('CAN', null, 30),
  ('UEFA_A', null, 65),
  ('QAT', null, 55),
  ('SUI', null, 19),
  ('BRA', null, 6),
  ('MAR', null, 8),
  ('SCO', null, 43),
  ('HAI', null, 83),
  ('USA', null, 16),
  ('PAR', null, 40),
  ('AUS', null, 27),
  ('UEFA_C', null, 22),
  ('GER', null, 10),
  ('ECU', null, 23),
  ('CIV', null, 34),
  ('CUR', null, 82),
  ('NED', null, 7),
  ('JPN', null, 18),
  ('TUN', null, 44),
  ('UEFA_F', null, 38),
  ('BEL', null, 9),
  ('EGY', null, 29),
  ('IRN', null, 21),
  ('NZL', null, 85),
  ('ESP', null, 2),
  ('URU', null, 17),
  ('KSA', null, 61),
  ('CPV', null, 69),
  ('FRA', null, 1),
  ('SEN', null, 14),
  ('NOR', null, 31),
  ('INTER_2', null, 57),
  ('ARG', null, 3),
  ('AUT', null, 24),
  ('ALG', null, 28),
  ('JOR', null, 63),
  ('POR', null, 5),
  ('COL', null, 13),
  ('UZB', null, 50),
  ('INTER_1', null, 46),
  ('ENG', null, 4),
  ('CRO', null, 11),
  ('GHA', null, 74),
  ('PAN', null, 33)
on conflict (team_id) do update
set
  draw_order = excluded.draw_order,
  updated_at = now();

comment on column public.team_discipline.draw_order is
  'FIFA/Coca-Cola Men''s World Ranking position used as final tiebreaker. Legacy column name retained for compatibility.';
