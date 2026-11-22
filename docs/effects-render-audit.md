# Проверка воспроизведения эффектов avgfx

Всего эффектов: **287**.

- пустые (ни частиц, ни квадов): **4**
- только искажение (`_DisturTex`, нужен шейдер): **2**
- только квады `MeshRenderer` (частиц нет): **13**
- частицы есть, но не появляются/не видны: **2**
- рисуют квады `MeshRenderer`: **104**
- используют неподдерживаемые слоты: **102**
- квады по настоящей геометрии меша: **78**
- с trail-полосами: **23**
- с суб-эмиттерами: **10**

## Пустые эффекты

| эффект | систем | причина |
|---|---|---|
| `avg_line_01` | 1 | нет ни живой системы частиц, ни квада с текстурой |
| `avg_mohu_biyan_01` | 1 | нет ни живой системы частиц, ни квада с текстурой |
| `avg_mohu_zhengyan_01` | 1 | нет ни живой системы частиц, ни квада с текстурой |
| `avg_mohu_zhuanchang_01` | 1 | нет ни живой системы частиц, ни квада с текстурой |

## Только искажение

Эти эффекты — шейдерный сдвиг кадра (`_DisturbTex`) без собственной текстуры: в 2D-канвасе их не воспроизвести, нужен шейдер поверх сцены.

- `avg_distorsion_01`
- `avg_space_water_curtain_distortion_01`

## Только квады `MeshRenderer`

### `avg_060_confusion_02`
- diwenli (confusion_08, confusion_02.webp, меш Plane007)
- diwenli_01 (confusion_09, confusion_02.webp, меш Plane007)
- xian_01 (confusion_06, trail_47_AVG.webp, меш Plane003)
- xian_01 (1) (confusion_07, confusion_03.webp, меш Plane003)
- xian_02 (confusion_06, trail_47_AVG.webp, меш Plane004)
- xian_02 (1) (confusion_07, confusion_03.webp, меш Plane004)
- xian_04 (confusion_06, trail_47_AVG.webp, меш Plane006)
- xian_04 (1) (confusion_07, confusion_03.webp, меш Plane006)

### `avg_060_confusion_02_01`
- diwenli (confusion_08, confusion_02.webp, меш Plane007)
- diwenli_01 (confusion_09, confusion_02.webp, меш Plane007)
- xian_01 (confusion_06, trail_47_AVG.webp, меш Plane003)
- xian_01 (1) (confusion_07, confusion_03.webp, меш Plane003)
- xian_02 (confusion_06, trail_47_AVG.webp, меш Plane004)
- xian_02 (1) (confusion_07, confusion_03.webp, меш Plane004)
- xian_04 (confusion_06, trail_47_AVG.webp, меш Plane006)
- xian_04 (1) (confusion_07, confusion_03.webp, меш Plane006)

### `avg_064_picture_tube_01`
- wenli (AVG_064_picture_tube_01, purple_fire_05.webp)

### `avg_073_blink_01`
- 0 (AVG_073_blink_02, mask_57.webp, меш Cone003)
- zu (AVG_073_blink_01, mask_31.webp, меш Cone001)
- 1 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 2 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 3 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 4 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 5 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 6 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)

### `avg_073_blink_02`
- zu (AVG_073_blink_01, mask_31.webp, меш Cone001)
- 0 (AVG_073_blink_02, mask_57.webp, меш Cone003)
- 1 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 2 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 3 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 4 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 5 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)
- 6 (AVG_073_blink_03, rosmon_07_2.webp, меш Plane.054)

### `avg_074_map_spin`
- l1 (AVG_074_map_02_06, mask_102.webp, меш 平面)
- l1_2 (AVG_074_map_02_07, mask_102.webp, меш 平面)
- l2 (AVG_074_map_02_04, mask_09.webp, меш 平面)
- l2_2 (AVG_074_map_02_05, mask_86_1.webp, меш 平面)
- l3_2 (AVG_074_map_02_03, mask_102.webp, меш 平面)
- l1_3 (AVG_074_map_02_08, mask_15.webp, меш 平面)
- l1_4 (AVG_074_map_02_09, mask_86_1.webp, меш 平面)

### `avg_common_lensspeedlines_02`
- Lens_plane_01 (AVG_Common_LensSpeedLines_02, AVG_flow_99_2.webp)

### `avg_daoguang_attack_01_large`
- d3 (AVG_02, AVG_daoguang_03.webp, меш Cone001)
- d4 (AVG_02, AVG_daoguang_03.webp, меш Cone001)
- gaoliang (AVG_07, AVG_daoguang_08.webp, меш Plane002)
- zhuti (AVG_08, AVG_daoguang_09.webp, меш Plane002)

### `avg_daoguang_attack_01_small`
- d3 (AVG_02, AVG_daoguang_03.webp, меш Cone001)
- d4 (AVG_02, AVG_daoguang_03.webp, меш Cone001)
- gaoliang (AVG_07, AVG_daoguang_08.webp, меш Plane002)
- zhuti (AVG_08, AVG_daoguang_09.webp, меш Plane002)

### `avg_daoguang_attack_02_large`
- d4 (AVG_02, AVG_daoguang_03.webp, меш Cone001)
- gaoliang (AVG_07, AVG_daoguang_08.webp, меш Plane002)

### `avg_daoguang_attack_02_small`
- d4 (AVG_02, AVG_daoguang_03.webp, меш Cone001)
- gaoliang (AVG_07, AVG_daoguang_08.webp, меш Plane002)

### `avg_quant_attack_01`
- quan_dm (quan_dm, trail_42_AVG.webp, меш Plane003)
- quan4_dm (quan4_dm, AVG_daoguang_03.webp, меш Plane003)

### `avg_quant_attack_02`
- quan_dm (1) (quan_dm3, trail_44_AVG.webp, меш banshanxian)
- 2 (2) (quanf_xin_dm, trail_46_AVG.webp, меш Plane014)
- 3 (quanxin1_dm, AVG_quanf_01.webp, меш Plane019)
- 2a (quanxin2_dm, AVG_trail_14.webp, меш Plane014)

## Не появляются частицы

### `avg_064_slashscreen_01`
- glow_02: позиция за кадром (-1775, 635)

### `avg_079_daoguang01`
- star_03: позиция за кадром (-15215, -8362)

## Слои MeshRenderer

### `avg_034_magic_fire_01`
- plane03 (AVG_wave_01, меш Plane002)
- plane03 (AVG_wave_01, меш Plane002)
- plane03 (1) (AVG_wave_02, меш Plane002)
- plane03 (1) (AVG_wave_02, меш Plane002)
- glow (6) (AVG_glow_01, меш Plane002)
- glow02 (1) (AVG_glow_01, меш Plane002)

### `avg_036_daoguang_01`
- ys (AVG_daoguang_lx_add_3, меш Plane011)
- an (AVG_daoguang_lx 1_1, меш Plane011)
- add1 (AVG_daoguang_lx 2_1, меш Plane011)

### `avg_047_infect_01`
- edge (AVG_blood_rain_01_edge)
- plane_01 (AVG_infect_smoke_02, меш Plane.030)

### `avg_056_wlfmster_01`
- plane04 (AVG_wlfmster_06_1, меш Plane002)
- plane0402 (AVG_wlfmster_06, меш Plane001)

### `avg_056_wlfmster_03`
- plane04 (AVG_wlfmster_06_2, меш Plane002)
- plane0402 (AVG_wlfmster_06, меш Plane001)

### `avg_058_hot_steam_01`
- wenli (AVG_058_hot_steam_03, меш Plane003)
- wenli11 (AVG_058_hot_steam_04, меш Plane003)
- wenli (2) (AVG_058_hot_steam_05, меш Plane004)
- wenli (3) (AVG_058_hot_steam_06, меш Plane004)

### `avg_059_purple_fire_01`
- 02 (purple_fire_03, меш Plane005)
- 01 (purple_fire_05, меш Plane013)
- 01 (1) (purple_fire_04, меш Plane005)
- 01 (2) (purple_fire_04, меш Plane005)
- 03 (purple_fire_06)
- 03 (1) (purple_fire_07)

### `avg_059_yanwu_hei_01`
- smoke_mx (avg_059_smoke_lx_01)
- smoke_mx (1) (avg_059_smoke_lx_01)

### `avg_059_yellow_fire_01`
- 02 (AVG_yellow_fire_02, меш Plane006)
- 01 (AVG_yellow_fire_01, меш Plane006)
- 03 (AVG_yellow_fire_03, меш Plane006)

### `avg_060_confusion_01`
- huan_m (confusion_04, меш Cone001)
- huan_mx (confusion_05, меш Cone001)

### `avg_060_confusion_02`
- diwenli (confusion_08, меш Plane007)
- diwenli_01 (confusion_09, меш Plane007)
- xian_01 (confusion_06, меш Plane003)
- xian_01 (1) (confusion_07, меш Plane003)
- xian_02 (confusion_06, меш Plane004)
- xian_02 (1) (confusion_07, меш Plane004)
- xian_04 (confusion_06, меш Plane006)
- xian_04 (1) (confusion_07, меш Plane006)
- xian_05 (confusion_06, меш Plane005)
- xian_05 (1) (confusion_07, меш Plane005)

### `avg_060_confusion_02_01`
- diwenli (confusion_08, меш Plane007)
- diwenli_01 (confusion_09, меш Plane007)
- xian_01 (confusion_06, меш Plane003)
- xian_01 (1) (confusion_07, меш Plane003)
- xian_02 (confusion_06, меш Plane004)
- xian_02 (1) (confusion_07, меш Plane004)
- xian_04 (confusion_06, меш Plane006)
- xian_04 (1) (confusion_07, меш Plane006)
- xian_05 (confusion_06, меш Plane005)
- xian_05 (1) (confusion_07, меш Plane005)

### `avg_060_dust_01`
- plane_bg (AVG_060_dust_02, меш gggw3)

### `avg_060_kaltsit_01`
- bg_somke_01 (AVG_060_kaltsit_01, меш sss_daoguang)
- bg_black_01 (AVG_060_kaltsit_02, меш sss_daoguang)
- quan1 (AVG_060_kaltsit_03, меш Cone002)
- quan1 (1) (AVG_060_kaltsit_04, меш general_ring_06_2)

### `avg_061_birth_01`
- Quad (AVG_061birth_02)

### `avg_061_church_01`
- Quad (AVG_061church_01, меш general_plane_59)
- Quad (1) (AVG_061church_01, меш general_plane_59)
- Quad (2) (AVG_061church_01, меш general_plane_59)
- Quad (3) (AVG_061church_01, меш general_plane_59)
- Quad (4) (AVG_061church_01, меш general_plane_59)

### `avg_062_black_01`
- black_bg (AVG_062_black_02)

### `avg_062_ice_01`
- ice ground (AVG_lx_xue_03, меш Plane001)

### `avg_062_tvnoise_01`
- p1 (AVG_062_tv_01)

### `avg_062_white_01`
- white_bg (AVG_062_white_01)

### `avg_064_a_flash_of_knife_01`
- ys (AVG_daoguang_lx_add_1, меш Plane011)
- an (AVG_daoguang_lx 1_1, меш Plane011)
- add1 (AVG_daoguang_lx 2_2, меш Plane011)

### `avg_064_fireup_01`
- fire_01 (AVG_064_fireup_01)
- fire_02 (AVG_064_fireup_02)
- fire_03 (AVG_064_fireup_01)
- fire_04 (AVG_064_fireup_03)
- fire_05 (AVG_064_fireup_01)

### `avg_064_fireup_02`
- fire_01 (AVG_064_fireup_04)
- fire_02 (AVG_064_fireup_04)

### `avg_064_firework_01`
- handle_01 (AVG_064_firework_11)
- bg_01 (AVG_064_firework_09)

### `avg_064_picture_tube_01`
- wenli (AVG_064_picture_tube_01)

### `avg_064_television_01`
- screen_01 (AVG_v64_television_06, меш AVG_v64_screen_01)
- screen_02 (AVG_v64_television_03, меш AVG_v64_screen_01)

### `avg_066_mantra_communication`
- xian (AVG_66_mantra_pian_xian)
- pian_an (AVG_66_mantra_pian_an)
- pian_add (AVG_66_mantra_pian_add)
- pian_add2 (AVG_66_mantra_pian_add2)
- linx2 (AVG_66_mantra_pian_xian_01, меш Plane003)
- linx1 (AVG_66_mantra_pian_xian_02, меш Plane003)

### `avg_067_camara_01`
- ui_01 (AVG_067_camaraui_06, меш AVG_067_camera_01)
- REC (AVG_067_camaraui_04)
- 120min (AVG_067_camaraui_01)
- raw (AVG_067_camaraui_03)

### `avg_069_smoke_01`
- light (AVG_069_smoke_light_01)

### `avg_070_originium_01`
- Area_01 (AVG_070_flow_01, меш Plane_perfect)

### `avg_070_vanish_01`
- moshui (2015_dusk_44, меш Cone001)

### `avg_072_light`
- dark (AVG_072_light_04)
- light (AVG_072_light_05)

### `avg_072_smokebomb`
- smoke_2 (AVG_072_smokebomb_02)
- Quad (AVG_072_smokebomb_06)

### `avg_072_speech`
- Quad (AVG_072_speech_02)

### `avg_073_blink_01`
- 0 (AVG_073_blink_02, меш Cone003)
- zu (AVG_073_blink_01, меш Cone001)
- 1 (AVG_073_blink_03, меш Plane.054)
- 2 (AVG_073_blink_03, меш Plane.054)
- 3 (AVG_073_blink_03, меш Plane.054)
- 4 (AVG_073_blink_03, меш Plane.054)
- 5 (AVG_073_blink_03, меш Plane.054)
- 6 (AVG_073_blink_03, меш Plane.054)
- 7 (AVG_073_blink_03, меш Plane.054)
- 8 (AVG_073_blink_03, меш Plane.054)

### `avg_073_blink_02`
- zu (AVG_073_blink_01, меш Cone001)
- 0 (AVG_073_blink_02, меш Cone003)
- 1 (AVG_073_blink_03, меш Plane.054)
- 2 (AVG_073_blink_03, меш Plane.054)
- 3 (AVG_073_blink_03, меш Plane.054)
- 4 (AVG_073_blink_03, меш Plane.054)
- 5 (AVG_073_blink_03, меш Plane.054)
- 6 (AVG_073_blink_03, меш Plane.054)
- 7 (AVG_073_blink_03, меш Plane.054)
- 8 (AVG_073_blink_03, меш Plane.054)

### `avg_074_lantern`
- light (AVG_074_lantern_01)
- bg (AVG_074_lantern_03)
- bg (1) (AVG_074_lantern_03)

### `avg_074_map_glow_1`
- 1 (AVG_074_map_02_10)
- 2 (AVG_074_map_02_11, меш FX_m_circle_07)
- light (AVG_074_map_02_13)
- cross_1 (AVG_074_map_02_14)
- cross_2 (AVG_074_map_02_14)
- cross_3 (AVG_074_map_02_14)
- cross_4 (AVG_074_map_02_14)

### `avg_074_map_glow_2`
- cross_1 (1) (AVG_074_map_02_14)
- cross_2 (1) (AVG_074_map_02_14)

### `avg_074_map_line`
- bg_1 (AVG_074_map_01_01)

### `avg_074_map_spin`
- l1 (AVG_074_map_02_06, меш 平面)
- l1_2 (AVG_074_map_02_07, меш 平面)
- l2 (AVG_074_map_02_04, меш 平面)
- l2_2 (AVG_074_map_02_05, меш 平面)
- l3_2 (AVG_074_map_02_03, меш 平面)
- l1_3 (AVG_074_map_02_08, меш 平面)
- l1_4 (AVG_074_map_02_09, меш 平面)

### `avg_079_ice`
- glow (3) (AVG_079_icecrack_003, меш general_ring_17)
- glow (AVG_079_icecrack_004)
- ground01 (AVG_079_icecrack_002, меш general_ring_17)
- grounddark (AVG_079_icecrack_001)

### `avg_079_slash02`
- plane03 (1) (AVG_079_flame_005, меш Plane002)
- plane03 (1) (AVG_079_flame_005, меш Plane002)
- glow (6) (AVG_079_glow_001, меш Plane002)

### `avg_079_slash_fire_01`
- fire_01 (AVG_079_slash_fire_01)
- fire_04 (AVG_079_slash_fire_03)
- plane03 (AVG_079_slash_fire_08, меш Plane002)
- plane03 (AVG_079_slash_fire_08, меш Plane002)
- plane03 (1) (AVG_079_slash_fire_10, меш Plane002)
- plane03 (1) (AVG_079_slash_fire_10, меш Plane002)
- fire_02 (AVG_079_slash_fire_02)
- fire_03 (AVG_079_slash_fire_01)

### `avg_079_yanwu_01`
- smoke_fxing_02_dm (1) (smoke_fxing_02_dm5, меш Plane001)

### `avg_50_sound_wave_02`
- qiliu (AVG_ 50_sound_wave_03, меш Cone002)
- qiliu1 (AVG_ 50_sound_wave_03, меш Cone002)

### `avg_51_lantern_01`
- ray_nei (AVG_liuming_01, меш Cylinder001)
- ray_wai (AVG_liuming_02, меш Cylinder001)
- ray_wai (1) (AVG_liuming_02, меш Cylinder001)

### `avg_53_fengsha_01`
- smoke_fxing_02_dm (3) (smoke_fxing_02_dm8, меш Plane001)
- smoke_fxing_02_dm (4) (smoke_fxing_02_dm7, меш Plane001)

### `avg_53_fengsha_02`
- smoke_fxing_02_dm (6) (smoke_fxing_02_dm11, меш Plane001)

### `avg_amiya_attack_01`
- trail_01 (AVG_trail_01, меш trail_04)
- trail_02 (AVG_trail_01, меш trail_06)
- trail_03 (AVG_trail_01, меш trail_04)
- trail_04 (AVG_trail_01, меш trail_04.001)
- trail_05 (AVG_trail_01, меш trail_06)
- trail_06 (AVG_trail_01, меш Plane.015)
- trail_1_3 (AVG_trail_01, меш trail_04)
- trail_07 (AVG_trail_01, меш trail_04.001)
- trail_04_1 (AVG_trail_01, меш trail_04)
- trail_06_2 (AVG_trail_01, меш Plane.015)

### `avg_black_fire_01`
- line_right_01 (AVG_golden_melody_14, меш AVG_quad_01)
- line_right_02 (AVG_golden_melody_14_3, меш AVG_quad_01)
- line_right_03 (AVG_golden_melody_14_2, меш AVG_quad_01)
- line_right_01 (1) (AVG_golden_melody_14, меш AVG_quad_01)
- line_right_02 (1) (AVG_golden_melody_14_3, меш AVG_quad_01)
- line_right_03 (1) (AVG_golden_melody_14_2, меш AVG_quad_01)

### `avg_blood_01`
- plane03 (AVG_blood_05, меш Plane002)
- plane03 (AVG_blood_05, меш Plane002)
- plane04 (AVG_blood_08, меш Plane002)
- plane04 (1) (AVG_blood_08, меш Plane002)

### `avg_blood_fire_01`
- Area_01 (AVG_blood_fire_01)
- Area_02 (AVG_blood_fire_02)
- Area_03 (AVG_blood_fire_03)
- Area_03_2 (AVG_blood_fire_04)
- Area_04 (AVG_blood_fire_05)
- Area_05 (AVG_blood_fire_07)
- Area_06 (AVG_blood_fire_08)
- Area_06_2 (AVG_blood_fire_09)
- Area_07 (AVG_blood_fire_10)
- Area_07_2 (AVG_blood_fire_11)

### `avg_blood_rain`
- edge (AVG_blood_rain_01_edge)

### `avg_clouds_01`
- niuqu (AVG_clouds_02)

### `avg_common_lensspeedlines_01`
- Lens_plane_01 (AVG_Common_LensSpeedLines_01)

### `avg_common_lensspeedlines_02`
- Lens_plane_01 (AVG_Common_LensSpeedLines_02)

### `avg_craddle`
- flow_1 (AVG_craddle_01, меш Cylinder002)
- flow_center (AVG_craddle_05, меш general_ring_03)
- flow_center_2 (AVG_craddle_06, меш general_ring_03)

### `avg_cross_star_explosion_01`
- zx (AVG_cross_star_explosion_05, меш Sphere001)
- Plane002 (AVG_cross_star_explosion_04, меш Plane002)
- Plane005 (AVG_cross_star_explosion_04, меш Plane005)
- Plane006 (AVG_cross_star_explosion_04, меш Plane006)
- Plane007 (AVG_cross_star_explosion_04, меш Plane007)
- Plane008 (AVG_cross_star_explosion_04, меш Plane008)

### `avg_dao_attack_guiji_01`
- dg_light (AVG_daoguang_x_01, меш Plane001)
- dg_dark (dg_light_l_02, меш Plane001)
- dg_flow (dg_light_l_03, меш Plane001)

### `avg_dao_attack_guiji_02`
- an (AVG_daoguang_lx 3, меш Plane013)
- add1 (AVG_daoguang_lx 8, меш Plane013)

### `avg_daoguang_attack_01_large`
- d3 (AVG_02, меш Cone001)
- d4 (AVG_02, меш Cone001)
- gaoliang (AVG_07, меш Plane002)
- zhuti (AVG_08, меш Plane002)

### `avg_daoguang_attack_01_small`
- d3 (AVG_02, меш Cone001)
- d4 (AVG_02, меш Cone001)
- gaoliang (AVG_07, меш Plane002)
- zhuti (AVG_08, меш Plane002)

### `avg_daoguang_attack_02_large`
- d4 (AVG_02, меш Cone001)
- gaoliang (AVG_07, меш Plane002)

### `avg_daoguang_attack_02_small`
- d4 (AVG_02, меш Cone001)
- gaoliang (AVG_07, меш Plane002)

### `avg_daoguang_guiji_03_blue`
- ys (AVG_daoguang_guiji_03_gold_01, меш Plane011)
- an (AVG_daoguang_lx 1_1, меш Plane011)
- add1 (AVG_daoguang_guiji_03_gold, меш Plane011)

### `avg_daoguang_guiji_03_gold`
- ys (AVG_daoguang_guiji_03_gold_01, меш Plane011)
- an (AVG_daoguang_lx 1_1, меш Plane011)
- add1 (AVG_daoguang_guiji_03_gold, меш Plane011)

### `avg_daoguang_guiji_04`
- ys (AVG_daoguang_lx_add, меш Plane013)
- an (AVG_daoguang_lx 1, меш Plane013)
- add1 (AVG_daoguang_lx 2, меш Plane013)

### `avg_daoguang_guiji_04_large`
- ys (AVG_daoguang_lx_add, меш Plane013)
- an (AVG_daoguang_lx 1, меш Plane013)
- add1 (AVG_daoguang_lx 2, меш Plane013)

### `avg_daoguang_jingji_large`
- an (AVG_daoguang_lx ci, меш Cone002)

### `avg_daoguang_moren_01_large`
- ys (AVG_daoguang_lx_add, меш Cone003)
- an (AVG_daoguang_lx 1, меш Cone003)
- add1 (AVG_daoguang_lx 2, меш Cone003)

### `avg_daoguang_red`
- dg_light (AVG_daoguang_red_01_light, меш Plane001)
- dg_dark (AVG_daoguang_red_01_dark, меш Plane001)
- dg_flow (AVG_daoguang_red_01_flow, меш Plane001)

### `avg_daoguang_zhixian_01_large`
- ys (AVG_daoguang_lx_add_1, меш Plane011)
- an (AVG_daoguang_lx 1_1, меш Plane011)
- add1 (AVG_daoguang_lx 2_1, меш Plane011)

### `avg_daoguang_zhixian_01_small`
- ys (AVG_daoguang_lx_add_1, меш Plane011)
- an (AVG_daoguang_lx 1_1, меш Plane011)
- add1 (AVG_daoguang_lx 2_1, меш Plane011)

### `avg_foodaroma_02`
- plane 01 (AVG_foodaroma_04, меш FX_m_flow_01)
- plane 02 (AVG_foodaroma_04, меш FX_m_flow_01)
- plane 03 (AVG_foodaroma_04, меш FX_m_flow_01)
- plane 04 (AVG_foodaroma_04, меш FX_m_flow_01)
- plane 05 (AVG_foodaroma_04, меш FX_m_flow_01)
- plane 06 (AVG_foodaroma_04, меш Plane002)
- plane 06 (1) (AVG_foodaroma_04, меш Plane002)
- plane 06 (2) (AVG_foodaroma_04, меш Plane002)
- plane 06 (3) (AVG_foodaroma_04, меш Plane002)
- plane 06 (4) (AVG_foodaroma_04, меш Plane002)

### `avg_golden_melody_01`
- line_01 (AVG_golden_melody_04, меш AVG_quad_01)
- music_01 (AVG_golden_melody_15)

### `avg_golden_melody_02`
- line_02 (AVG_golden_melody_05, меш AVG_quad_01)

### `avg_golden_ray`
- Quad (AVG_golden_ray_04)

### `avg_guafeng_01`
- guaf1_dm (guaf1_dm, меш trail01_dm)
- guaf1_dm01 (guaf1_dm, меш trail01_dm)

### `avg_huanjing_effect_01`
- smoke_fxing_02_dm2 (smoke_fxing_02_dm2, меш Plane001)
- shui01_dm (shui01_dm, меш Cone001)
- shui01_dm2 (shui01_dm2, меш Cone001)
- pian_dm (pian_dm)
- shui01_dm2 (1) (shui01_dm3, меш Cone001)
- smoke_fxing_02_dm2 (1) (smoke_fxing_02_dm3, меш Plane001)

### `avg_magic_shield`
- flow_ab (magic_shield_01_flow_ab, меш Sphere001)
- dark (magic_shield_02_dark)
- light (magic_shield_03_light)
- flow_light (magic_shield_04_flow_light, меш Sphere001)

### `avg_magic_shield_start`
- scan (magic_shield_07_scan, меш Sphere001)
- flow_light (magic_shield_04_flow_light, меш Sphere001)
- dark (magic_shield_02_dark)
- light (magic_shield_03_light)

### `avg_nearl_showup`
- flow (AVG_nearl_03, меш Cylinder001)

### `avg_old_tv_01`
- huang (AVG_old_tv_03)
- dianzhen (AVG_old_tv_02)

### `avg_quant_attack_01`
- quan_dm (quan_dm, меш Plane003)
- quan4_dm (quan4_dm, меш Plane003)

### `avg_quant_attack_02`
- quan_dm (1) (quan_dm3, меш banshanxian)
- 2 (2) (quanf_xin_dm, меш Plane014)
- 3 (quanxin1_dm, меш Plane019)
- 2a (quanxin2_dm, меш Plane014)

### `avg_rain_03`
- pool_left_01 (AVG_rain_pool_left_01)
- pool_right (AVG_rain_pool_left_02)
- shadow_01 (AVG_rain_shadow_01)

### `avg_route`
- route (AVG_route_final_01, меш AVG_route_01_2)
- route_star (AVG_route_final_star_01, меш AVG_route_01_2)

### `avg_sand_tornado_01`
- mx (AVG_053_lx_01, меш Cone001)
- mx2 (AVG_053_lx_05, меш Plane004)
- mx (1) (AVG_053_lx_06, меш Plane005)
- mx (2) (AVG_053_lx_06, меш Plane005)

### `avg_smoke_ptc`
- light (AVG_smoke_ptc_01)

### `avg_snow_01`
- bing (AVG_lx_xue_03, меш Plane001)

### `avg_soul_glow`
- flow_1 (AVG_soul_glow_02, меш general_ring_03)
- flow_2 (AVG_soul_glow_03, меш general_ring_03)

### `avg_spotlight`
- mx_wenli (AVG_daoguang_lx_az 3)
- bian (AVG_daoguang_lx_az 2, меш Plane013)
- bian1 (AVG_daoguang_lx_az 2, меш Plane013)

### `avg_spotlight_01`
- mx_wenli (AVG_daoguang_lx_az 3)
- bian (AVG_daoguang_lx_az 2, меш Plane013)
- bian1 (AVG_daoguang_lx_az 2, меш Plane013)

### `avg_spotlight_02`
- 01 (AVG_22_XX, меш xh_shizi001)
- bian (AVG_daoguang_lx_az 2, меш Plane013)
- bian1 (AVG_daoguang_lx_az 2, меш Plane013)

### `avg_steam_01`
- smoke_large_02 (AVG_steam_01, меш general_ring_03)

### `avg_sunshine_01`
- sunshine_02 (AVG_sunshine_02, меш AVG_plane_06)
- sunshine_03 (AVG_sunshine_03, меш AVG_plane_06)

### `avg_tlxy_laugh`
- light (AVG_tlxy_07)

### `avg_v074_underwater_01`
- water_03 (AVG_V074_underwater_03)
- water_04 (AVG_V074_underwater_06)

### `avg_wlfmster_01`
- plane03 (AVG_wlfmster_02, меш Plane002)
- plane03 (AVG_wlfmster_02, меш Plane002)

### `avg_wlfmster_02`
- plane03 (AVG_wlfmster_02, меш Plane002)
- plane03 (AVG_wlfmster_02, меш Plane002)

### `avg_wlfmster_eye_01`
- shanguang_02 (AVG_wlfmster_eye_02)
- trail001 (AVG_wlfmster_eye_03, меш Plane.058)
- shanguang_03 (AVG_wlfmster_eye_02)

### `avg_wlfmster_eye_02`
- shanguang_02 (AVG_wlfmster_eye_02)
- trail001 (AVG_wlfmster_eye_03, меш Plane.058)
- shanguang_03 (AVG_wlfmster_eye_02)

### `avg_yanwu_01`
- smoke_fxing_02_dm (smoke_fxing_02_dm, меш Plane001)

## Все эффекты

| эффект | статус |
|---|---|
| `avg_034_magic_fire_01` | частицы + квады |
| `avg_034_magic_fire_02` | частицы |
| `avg_035_sandfall_01` | частицы |
| `avg_036_daoguang_01` | частицы + квады |
| `avg_036_roar_01` | частицы |
| `avg_042_fire_01` | частицы |
| `avg_042_glow_01` | частицы |
| `avg_042_glow_02` | частицы |
| `avg_042_glow_03` | частицы |
| `avg_042_glow_04` | частицы |
| `avg_043_burst_01` | частицы |
| `avg_043_start_01` | частицы |
| `avg_043_yanchen_01` | частицы |
| `avg_047_infect_01` | частицы + квады |
| `avg_048_smoke_01` | частицы |
| `avg_051_sea_01` | частицы |
| `avg_056_rainy_01` | частицы |
| `avg_056_stage_01` | частицы |
| `avg_056_stage_02` | частицы |
| `avg_056_tvnoise_01` | частицы |
| `avg_056_wlfmster_01` | частицы + квады |
| `avg_056_wlfmster_03` | частицы + квады |
| `avg_057_steam` | частицы |
| `avg_058_hot_steam_01` | частицы + квады |
| `avg_058_snow_01` | частицы |
| `avg_058_tyndall_01` | частицы |
| `avg_059_purple_fire_01` | частицы + квады |
| `avg_059_yanwu_hei_01` | частицы + квады |
| `avg_059_yanwu_hei_02` | частицы |
| `avg_059_yellow_fire_01` | частицы + квады |
| `avg_060_confusion_01` | частицы + квады |
| `avg_060_confusion_02` | только квады |
| `avg_060_confusion_02_01` | только квады |
| `avg_060_dust_01` | частицы + квады |
| `avg_060_glitch_01` | частицы |
| `avg_060_kal_01` | частицы |
| `avg_060_kaltsit_01` | частицы + квады |
| `avg_060_m3_01` | частицы |
| `avg_060_projection_birth` | частицы |
| `avg_060_projection_die` | частицы |
| `avg_060_projection_time` | частицы |
| `avg_060_red_dot_01` | частицы |
| `avg_061_birth_01` | частицы + квады |
| `avg_061_church_01` | частицы + квады |
| `avg_061_church_02` | частицы |
| `avg_061_glow_01` | частицы |
| `avg_062_black_01` | частицы + квады |
| `avg_062_black_02` | частицы |
| `avg_062_cloud_01` | частицы |
| `avg_062_ice_01` | частицы + квады |
| `avg_062_smoke_01` | частицы |
| `avg_062_smoke_02` | частицы |
| `avg_062_tvnoise_01` | частицы + квады |
| `avg_062_white_01` | частицы + квады |
| `avg_062_white_02` | частицы |
| `avg_064_a_flash_of_knife_01` | частицы + квады |
| `avg_064_blood_falling_01` | частицы |
| `avg_064_fireup_01` | частицы + квады |
| `avg_064_fireup_02` | частицы + квады |
| `avg_064_firework_01` | частицы + квады |
| `avg_064_flamescreen_01` | частицы |
| `avg_064_flameslash_01` | частицы |
| `avg_064_picture_tube_01` | только квады |
| `avg_064_slashscreen_01` | частицы, часть систем молчит |
| `avg_064_television_01` | частицы + квады |
| `avg_066_fool's_transition` | частицы |
| `avg_066_leaves_falling` | частицы |
| `avg_066_mantra_close_up` | частицы |
| `avg_066_mantra_communication` | частицы + квады |
| `avg_066_mantra_open` | частицы |
| `avg_067_avalanche_01` | частицы |
| `avg_067_camara_01` | частицы + квады |
| `avg_069_dizzy_01` | частицы |
| `avg_069_firefly_01` | частицы |
| `avg_069_smoke_01` | частицы + квады |
| `avg_070_chen_jianqi_01` | частицы |
| `avg_070_chen_juqi_01` | частицы |
| `avg_070_daoguang_01` | частицы |
| `avg_070_daoguang_02` | частицы |
| `avg_070_originium_01` | частицы + квады |
| `avg_070_shuimoqizi_01` | частицы |
| `avg_070_vanish_01` | частицы + квады |
| `avg_071_arrow_01` | частицы |
| `avg_071_light_01` | частицы |
| `avg_071_lightning_01` | частицы |
| `avg_071_smock_01` | частицы |
| `avg_072_light` | частицы + квады |
| `avg_072_smokebomb` | частицы + квады |
| `avg_072_snow` | частицы |
| `avg_072_speech` | частицы + квады |
| `avg_073_blink_01` | только квады |
| `avg_073_blink_02` | только квады |
| `avg_073_code_01` | частицы |
| `avg_073_light_01` | частицы |
| `avg_073_oripathy_01` | частицы |
| `avg_073_oripathy_heal_01` | частицы |
| `avg_073_oripathy_heal_02` | частицы |
| `avg_073_slash_01` | частицы |
| `avg_073_smoke_01` | частицы |
| `avg_074_lantern` | частицы + квады |
| `avg_074_map_glow_1` | частицы + квады |
| `avg_074_map_glow_2` | частицы + квады |
| `avg_074_map_line` | частицы + квады |
| `avg_074_map_spin` | только квады |
| `avg_076_light` | частицы |
| `avg_076_screen` | частицы |
| `avg_076_star` | частицы |
| `avg_076_wind` | частицы |
| `avg_077_aigis_01` | частицы |
| `avg_077_aigis_02` | частицы |
| `avg_077_alloutattack_01` | частицы |
| `avg_077_boss_01` | частицы |
| `avg_077_butterfly` | частицы |
| `avg_077_flower` | частицы |
| `avg_077_fuuka_01` | частицы |
| `avg_077_yukari_01` | частицы |
| `avg_079_daoguang01` | частицы, часть систем молчит |
| `avg_079_daoguang02` | частицы |
| `avg_079_daoguang02_hit` | частицы |
| `avg_079_dynameicmask` | частицы |
| `avg_079_eyes_01` | частицы |
| `avg_079_eyes_02` | частицы |
| `avg_079_fire_01` | частицы |
| `avg_079_flameslash_01` | частицы |
| `avg_079_ice` | частицы + квады |
| `avg_079_leafmask` | частицы |
| `avg_079_leafmaskloop` | частицы |
| `avg_079_redsmoke_01` | частицы |
| `avg_079_slash01` | частицы |
| `avg_079_slash02` | частицы + квады |
| `avg_079_slash_fire_01` | частицы + квады |
| `avg_079_slash_fire_02` | частицы |
| `avg_079_yanwu_01` | частицы + квады |
| `avg_50_light_of_origin_stone_01` | частицы |
| `avg_50_smoke_01` | частицы |
| `avg_50_sound_wave_01` | частицы |
| `avg_50_sound_wave_02` | частицы + квады |
| `avg_50_sunlight_01` | частицы |
| `avg_51_clouds_01` | частицы |
| `avg_51_lantern_01` | частицы + квады |
| `avg_51_talks_01` | частицы |
| `avg_53_black_line_01` | частицы |
| `avg_53_black_line_02` | частицы |
| `avg_53_fengsha_01` | частицы + квады |
| `avg_53_fengsha_02` | частицы + квады |
| `avg_53_happy_01` | частицы |
| `avg_53_happy_02` | частицы |
| `avg_53_matter_01` | частицы |
| `avg_53_proud_01` | частицы |
| `avg_53_question_01` | частицы |
| `avg_53_shy_01` | частицы |
| `avg_53_sweat_01` | частицы |
| `avg_66_mantra_source_stone` | частицы |
| `avg_76_emoji_angry` | частицы |
| `avg_76_emoji_cheer_01` | частицы |
| `avg_amiya_attack_01` | частицы + квады |
| `avg_black_fire_01` | частицы + квады |
| `avg_black_fire_02` | частицы |
| `avg_black_fire_03` | частицы |
| `avg_blkkgt_breathe_01` | частицы |
| `avg_blood_01` | частицы + квады |
| `avg_blood_fire_01` | частицы + квады |
| `avg_blood_rain` | частицы + квады |
| `avg_changqiang_attack_01` | частицы |
| `avg_changqiang_hit_01` | частицы |
| `avg_clouds_01` | частицы + квады |
| `avg_common_cozy_01` | частицы |
| `avg_common_lensspeedlines_01` | частицы + квады |
| `avg_common_lensspeedlines_02` | только квады |
| `avg_common_speedlines_01` | частицы |
| `avg_common_speedlines_02` | частицы |
| `avg_common_underwatertransition_01` | частицы |
| `avg_craddle` | частицы + квады |
| `avg_cross_star_explosion_01` | частицы + квады |
| `avg_dao_attack_guiji_01` | частицы + квады |
| `avg_dao_attack_guiji_02` | частицы + квады |
| `avg_dao_guiji_hit_01` | частицы |
| `avg_dao_guiji_hit_02` | частицы |
| `avg_daoguang_attack_01_large` | только квады |
| `avg_daoguang_attack_01_small` | только квады |
| `avg_daoguang_attack_02_large` | только квады |
| `avg_daoguang_attack_02_small` | только квады |
| `avg_daoguang_guiji_03_blue` | частицы + квады |
| `avg_daoguang_guiji_03_gold` | частицы + квады |
| `avg_daoguang_guiji_04` | частицы + квады |
| `avg_daoguang_guiji_04_large` | частицы + квады |
| `avg_daoguang_guiji_07` | частицы |
| `avg_daoguang_hit_01` | частицы |
| `avg_daoguang_hit_02` | частицы |
| `avg_daoguang_jingji_large` | частицы + квады |
| `avg_daoguang_moren_01_large` | частицы + квады |
| `avg_daoguang_red` | частицы + квады |
| `avg_daoguang_spark_01_large` | частицы |
| `avg_daoguang_spark_01_mid` | частицы |
| `avg_daoguang_spark_02_large` | частицы |
| `avg_daoguang_spark_02_mid` | частицы |
| `avg_daoguang_zhixian_01_large` | частицы + квады |
| `avg_daoguang_zhixian_01_small` | частицы + квады |
| `avg_distorsion_01` | пусто |
| `avg_dunji_01_large` | частицы |
| `avg_dunji_01_small` | частицы |
| `avg_dunji_02_large` | частицы |
| `avg_dunji_02_small` | частицы |
| `avg_dust_01` | частицы |
| `avg_energycircle_01` | частицы |
| `avg_fashu_hit_01` | частицы |
| `avg_fashu_hit_02` | частицы |
| `avg_fengsha_01` | частицы |
| `avg_fengsha_02` | частицы |
| `avg_fire_01` | частицы |
| `avg_firefly_01` | частицы |
| `avg_fireworks_01` | частицы |
| `avg_foodaroma_01` | частицы |
| `avg_foodaroma_02` | частицы + квады |
| `avg_golden_melody_01` | частицы + квады |
| `avg_golden_melody_02` | частицы + квады |
| `avg_golden_ray` | частицы + квады |
| `avg_golden_star_01` | частицы |
| `avg_guafeng_01` | частицы + квады |
| `avg_huanjing_effect_01` | частицы + квады |
| `avg_line_01` | пусто |
| `avg_magic_fire_01` | частицы |
| `avg_magic_ice_01` | частицы |
| `avg_magic_lighting_01` | частицы |
| `avg_magic_pingzhang_01` | частицы |
| `avg_magic_reflection_01` | частицы |
| `avg_magic_shield` | частицы + квады |
| `avg_magic_shield_start` | частицы + квады |
| `avg_mohu_biyan_01` | пусто |
| `avg_mohu_zhengyan_01` | пусто |
| `avg_mohu_zhuanchang_01` | пусто |
| `avg_nearl_showup` | частицы + квады |
| `avg_nearl_trail` | частицы |
| `avg_old_tv_01` | частицы + квады |
| `avg_quant_attack_01` | только квады |
| `avg_quant_attack_02` | только квады |
| `avg_quant_hit_01` | частицы |
| `avg_quant_hit_02` | частицы |
| `avg_rain_01` | частицы |
| `avg_rain_02` | частицы |
| `avg_rain_03` | частицы + квады |
| `avg_route` | частицы + квады |
| `avg_sand_tornado_01` | частицы + квады |
| `avg_scifiscreen_01` | частицы |
| `avg_screen_disturb_1` | частицы |
| `avg_screen_disturb_2` | частицы |
| `avg_sheep_show_01` | частицы |
| `avg_sheji_01` | частицы |
| `avg_shuihua` | частицы |
| `avg_shuihua_01` | частицы |
| `avg_signalinterference_01` | частицы |
| `avg_slbell_glow_01` | частицы |
| `avg_smoke_ptc` | частицы + квады |
| `avg_snow_01` | частицы + квады |
| `avg_snow_02` | частицы |
| `avg_snowstorm_01` | частицы |
| `avg_soul_glow` | частицы + квады |
| `avg_space_water_curtain_distortion_01` | пусто |
| `avg_spotlight` | частицы + квады |
| `avg_spotlight_01` | частицы + квады |
| `avg_spotlight_02` | частицы + квады |
| `avg_steam_01` | частицы + квады |
| `avg_street_white_light_01` | частицы |
| `avg_suduxian` | частицы |
| `avg_sunlight_left_01` | частицы |
| `avg_sunlight_right_01` | частицы |
| `avg_sunshine_01` | частицы + квады |
| `avg_tlxy_laugh` | частицы + квады |
| `avg_v068_birds_01` | частицы |
| `avg_v068_dissolve_01` | частицы |
| `avg_v068_dust_01` | частицы |
| `avg_v068_flower_01` | частицы |
| `avg_v068_rain_01` | частицы |
| `avg_v071_glow_01` | частицы |
| `avg_v071_glow_02` | частицы |
| `avg_v071_line_01` | частицы |
| `avg_v074_underwater_01` | частицы + квады |
| `avg_water_hide_01` | частицы |
| `avg_water_show_01` | частицы |
| `avg_wind_01` | частицы |
| `avg_wlfmster_01` | частицы + квады |
| `avg_wlfmster_02` | частицы + квады |
| `avg_wlfmster_eye_01` | частицы + квады |
| `avg_wlfmster_eye_02` | частицы + квады |
| `avg_wuli_hit_01` | частицы |
| `avg_yanwu_01` | частицы + квады |
| `avg_zuzong_01` | частицы |

## Неподдерживаемые слоты материала

- `_DisturbTex` — 93 эффектов
- `_MainUSpeed` — 59 эффектов
- `_MainVSpeed` — 38 эффектов
- `_MaskTex` — 1 эффектов
