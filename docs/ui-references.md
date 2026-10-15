# 日历与磁带组件参考

本轮由用户提供 `public/demo/section1`、`public/demo/section2` 原始 HTML/CSS，分别改写为 `StreetCalendar` 和 `CassettePlayer`。源文件保留作参考，不在页面直接加载。

- 日历：ashif_6672，https://uiverse.io/ashif_6672/yellow-kangaroo-18
- 磁带：Praashoo7 (Prashant)，https://uiverse.io/Praashoo7/jolly-bulldog-31

日历调整为天气时间下方的横向纸签，只展示年、月、日期和星期；磁带位于爷爷柜台的音乐控制纸签内。复用站内字体、场景时钟和音频单例，示例中的固定日期、隐藏的昼夜切换和独立常驻动画不接入页面。

移动端由公共 `MusicDock` 提供跨场景底部播放栏，详情内提供音量控制；店外不增加选曲。店内导航为底栏预留高度，专注侧栏收起时保留计时、进度及暂停／完成状态。展开页向左避让侧栏，同时避开底部播放栏与店内导航。写信、读信和店员对话期间隐藏公共控件，播放与计时继续。

## MIT License

Copyright (c) 2026 ashif_6672

Copyright (c) 2026 Praashoo7 (Prashant)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
