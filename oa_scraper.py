#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
吉林大学OA系统爬虫 - 用于爬取今日通知
"""

import requests
from bs4 import BeautifulSoup
import json

# 目标URL
TARGET_URL = "https://oa.jlu.edu.cn/defaultroot/PortalInformation!jldxList.action?channelId=179577"

# 设置请求头
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
}

def scrape_oa_notices():
    """
    爬取吉林大学OA系统今日通知
    """
    try:
        # 发送请求
        response = requests.get(TARGET_URL, headers=headers, timeout=10)
        response.raise_for_status()  # 检查请求是否成功
        
        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 存储今日通知
        today_notices = []
        
        # 查找所有通知项
        for notice_item in soup.select('.li.rel'):
            # 检查是否为今日通知
            time_element = notice_item.select_one('.time')
            if time_element and '今天' in time_element.text:
                # 提取通知信息
                title_element = notice_item.select_one('.font14')
                org_element = notice_item.select_one('.column')
                
                if title_element and org_element:
                    notice = {
                        'title': title_element.text.strip(),
                        'url': 'https://oa.jlu.edu.cn/defaultroot/' + title_element['href'] if title_element.get('href') else '',
                        'organization': org_element.text.strip(),
                        'time': time_element.text.strip()
                    }
                    today_notices.append(notice)
        
        return {
            'success': True,
            'data': today_notices,
            'message': f'成功获取{len(today_notices)}条今日通知'
        }
        
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            return {
                'success': False,
                'data': [],
                'message': '需要内网访问吉林大学OA系统'
            }
        return {
            'success': False,
            'data': [],
            'message': f'HTTP错误: {e.response.status_code}'
        }
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'data': [],
            'message': f'请求异常: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'data': [],
            'message': f'解析错误: {str(e)}'
        }

if __name__ == '__main__':
    # 执行爬虫并打印结果
    result = scrape_oa_notices()
    print(json.dumps(result, ensure_ascii=False, indent=2))