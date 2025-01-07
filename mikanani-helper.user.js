// ==UserScript==
// @name         蜜柑计划助手
// @version      1.5
// @description  提取页面中的番剧数据并在点击按钮后显示，支持格式化输出和 JSON 输出，点击按钮切换浮窗显示
// @match        https://mikanani.me/
// @grant        none
// @updateURL    https://github.com/MagmaBlock/my-browser-scripts/raw/refs/heads/main/mikanani-helper.user.js
// @downloadURL  https://github.com/MagmaBlock/my-browser-scripts/raw/refs/heads/main/mikanani-helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    // 确保当前页面是 https://mikanani.me/ 的首页
    if (window.location.href !== 'https://mikanani.me/') {
        return;
    }

    // 添加按钮到页面左下角
    const button = document.createElement('button');
    button.textContent = '提取番剧数据';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.left = '20px';
    button.style.zIndex = '10000';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#007bff';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    document.body.appendChild(button);

    // 添加浮窗用于显示结果
    const resultWindow = document.createElement('div');
    resultWindow.style.position = 'fixed';
    resultWindow.style.bottom = '60px';
    resultWindow.style.left = '20px';
    resultWindow.style.zIndex = '10000';
    resultWindow.style.backgroundColor = '#fff';
    resultWindow.style.border = '1px solid #ccc';
    resultWindow.style.borderRadius = '5px';
    resultWindow.style.padding = '10px';
    resultWindow.style.maxWidth = '300px';
    resultWindow.style.maxHeight = '200px';
    resultWindow.style.overflowY = 'auto';
    resultWindow.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
    resultWindow.style.display = 'none'; // 默认隐藏
    document.body.appendChild(resultWindow);

    // 添加 Tab 切换按钮
    const tabContainer = document.createElement('div');
    tabContainer.style.display = 'flex';
    tabContainer.style.marginBottom = '10px';
    const formatTab = document.createElement('button');
    formatTab.textContent = '格式化输出';
    formatTab.style.flex = '1';
    formatTab.style.padding = '5px';
    formatTab.style.backgroundColor = '#007bff';
    formatTab.style.color = '#fff';
    formatTab.style.border = 'none';
    formatTab.style.borderRadius = '3px';
    formatTab.style.cursor = 'pointer';
    const jsonTab = document.createElement('button');
    jsonTab.textContent = 'JSON 输出';
    jsonTab.style.flex = '1';
    jsonTab.style.marginLeft = '5px';
    jsonTab.style.padding = '5px';
    jsonTab.style.backgroundColor = '#6c757d';
    jsonTab.style.color = '#fff';
    jsonTab.style.border = 'none';
    jsonTab.style.borderRadius = '3px';
    jsonTab.style.cursor = 'pointer';
    tabContainer.appendChild(formatTab);
    tabContainer.appendChild(jsonTab);
    resultWindow.appendChild(tabContainer);

    // 添加格式化输出内容区域
    const formatContent = document.createElement('div');
    formatContent.style.display = 'block'; // 默认显示
    resultWindow.appendChild(formatContent);

    // 添加 JSON 输出内容区域
    const jsonContent = document.createElement('div');
    jsonContent.style.display = 'none'; // 默认隐藏
    const copyButton = document.createElement('button');
    copyButton.textContent = '复制 JSON';
    copyButton.style.marginBottom = '10px';
    copyButton.style.padding = '5px 10px';
    copyButton.style.backgroundColor = '#28a745';
    copyButton.style.color = '#fff';
    copyButton.style.border = 'none';
    copyButton.style.borderRadius = '3px';
    copyButton.style.cursor = 'pointer';
    const jsonTextarea = document.createElement('textarea');
    jsonTextarea.style.width = '100%';
    jsonTextarea.style.height = '100px';
    jsonTextarea.style.resize = 'none';
    jsonTextarea.readOnly = true;
    jsonContent.appendChild(copyButton);
    jsonContent.appendChild(jsonTextarea);
    resultWindow.appendChild(jsonContent);

    // 面板显示状态
    let isPanelVisible = false;
    let isTouchInteraction = false;
    let hideTimeout;

    // 显示面板
    function showPanel() {
        // 运行提取数据的脚本
        const extractedData = extractData();

        // 更新格式化输出
        if (extractedData.length > 0) {
            formatContent.innerHTML = extractedData
                .map(item => `<div><strong>${item.animeName}</strong> (ID: ${item.bangumiId})</div>`)
                .join('');
        } else {
            formatContent.innerHTML = '<div>未找到番剧数据</div>';
        }

        // 更新 JSON 输出
        jsonTextarea.value = JSON.stringify(extractedData, null, 2);

        resultWindow.style.display = 'block';
        isPanelVisible = true;
    }

    // 隐藏面板
    function hidePanel() {
        resultWindow.style.display = 'none';
        isPanelVisible = false;
    }

    // 切换面板显示/隐藏
    function togglePanel() {
        if (isPanelVisible) {
            hidePanel();
        } else {
            showPanel();
        }
    }

    // 处理触摸开始
    button.addEventListener('touchstart', (e) => {
        isTouchInteraction = true;
        e.preventDefault(); // 防止触发 click 事件
        clearTimeout(hideTimeout);
        if (!isPanelVisible) {
            showPanel();
        }
    }, { passive: false });

    // 处理鼠标进入
    button.addEventListener('mouseenter', () => {
        if (!isTouchInteraction) {
            clearTimeout(hideTimeout);
            showPanel();
        }
    });

    // 处理触摸结束
    resultWindow.addEventListener('touchend', (e) => {
        if (!resultWindow.contains(e.target) && !button.contains(e.target)) {
            hideTimeout = setTimeout(() => {
                hidePanel();
            }, 500);
        }
    });

    // 处理鼠标离开
    resultWindow.addEventListener('mouseleave', () => {
        if (!isTouchInteraction) {
            hideTimeout = setTimeout(() => {
                hidePanel();
            }, 500);
        }
    });

    resultWindow.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
    });

    // 处理点击事件
    button.addEventListener('click', (e) => {
        if (!isTouchInteraction) {
            e.stopPropagation();
            togglePanel();
        }
    });

    // 处理页面点击
    document.addEventListener('click', (e) => {
        if (isPanelVisible && !resultWindow.contains(e.target) && !button.contains(e.target)) {
            hidePanel();
        }
    });

    // 重置触摸状态
    document.addEventListener('touchstart', () => {
        isTouchInteraction = true;
    });
    document.addEventListener('touchend', () => {
        setTimeout(() => {
            isTouchInteraction = false;
        }, 100);
    });

    // Tab 切换事件
    formatTab.addEventListener('click', () => {
        formatContent.style.display = 'block';
        jsonContent.style.display = 'none';
        formatTab.style.backgroundColor = '#007bff';
        jsonTab.style.backgroundColor = '#6c757d';
    });

    jsonTab.addEventListener('click', () => {
        formatContent.style.display = 'none';
        jsonContent.style.display = 'block';
        formatTab.style.backgroundColor = '#6c757d';
        jsonTab.style.backgroundColor = '#007bff';
    });

    // 复制 JSON 按钮点击事件
    copyButton.addEventListener('click', () => {
        jsonTextarea.select();
        document.execCommand('copy');
        copyButton.textContent = '已复制！';
        setTimeout(() => {
            copyButton.textContent = '复制 JSON';
        }, 2000);
    });

    // 提取数据的函数
    function extractData() {
        const liElements = document.querySelectorAll('li');
        const extractedData = [];

        liElements.forEach(li => {
            const spanElement = li.querySelector('span[data-bangumiid]');
            const bangumiId = spanElement ? spanElement.getAttribute('data-bangumiid') : null;

            let animeNameElement = li.querySelector('.an-info .an-info-group a');
            let animeName = animeNameElement ? animeNameElement.textContent.trim() : null;

            if (!animeName) {
                animeNameElement = li.querySelector('.an-info .an-info-group .date-text[title]');
                animeName = animeNameElement ? animeNameElement.getAttribute('title') : null;
            }

            if (bangumiId && animeName) {
                extractedData.push({
                    bangumiId: bangumiId,
                    animeName: animeName
                });
            }
        });

        return extractedData;
    }
})();
