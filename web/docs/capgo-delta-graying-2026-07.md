# 安卓差量转正·真机灰度一页清单（2026-07-07）

> 现状：Capgo 差量管线 2026-06-11 就建好了（构建/对象包/deploy 完备闸全在·S8 27 断言绿），
> 但从未真机验证，deploy.py 默认剥掉 manifest → 安卓玩家至今**每次 OTA 全量 460-880MB**。
> 本清单跑通一次，差量即可转正：第二版起安卓更新只下几 MB。

## 需要什么

- 一台**还停在旧版**的安卓设备（当前线上 1.3.4.6·任何旧版都行）
- 电脑连 adb（看日志用·非必须但强烈建议）
- 建议设备连 WiFi（首次差量≈全量体积·Capgo 机制所限·从第二版才是真差量）

## 步骤

**第 1 步·等下一次正常发版上线**（全量端一切正常后再灰度·比如 ship-1.3.4.7）。

**第 2 步·服务器开差量**（1Panel 终端·即时生效·不改版本）：

```bash
curl -sL https://github.com/misfit-user/tianming/releases/download/ship-<V>/deploy.py -o /tmp/d.py
python3 /tmp/d.py --only capgo --enable-manifest
```

**第 3 步·真机观察**（旧版设备启动游戏）：

- 应看到 OTA 金卡开始更新
- adb 日志：`adb logcat | grep -iE "capgo|updater"`
- 预期：`download_manifest` 日志·~1200 个文件逐个下（首次差量≈全量体积·断点可续）
- 装完启动正常、版本号对 → 首轮通过

**第 4 步·真验收（下一版发布时·同一设备再更一次）**：

- 预期：logcat 大量 `already cached`·只下变更文件·流量几 MB
- 这一步过了才算差量真跑通

**回退（任何一步出问题·即时·不用改版本）**：

```bash
python3 /tmp/d.py --only capgo --disable-manifest
```

## 验收后的转正动作（告诉 Claude 执行）

真验收（第 4 步）通过后说一声，改两处即转正：
1. `scripts/deploy.py` capgo 默认改为**携带 manifest**（不再需要 `--enable-manifest`）
2. 服务器自动部署（tianming-autodeploy）随之每版自动发差量·安卓端从此告别全量

## 关联

- 总设计与护栏：`web/docs/update-system-upgrade-2026-06.md` 第六节
- 护栏回顾：`latest.json` 永远保留 `url+size`（老客户端只认这俩）·Capgo 自带 20s notifyAppReady 回滚·
  deploy 完备闸保证 manifest 引用对象必在服务器
