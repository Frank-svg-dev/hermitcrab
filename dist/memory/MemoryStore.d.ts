/**
 * Memory 存储模块
 * 用于存储用户画像和学习数据
 */
export declare class MemoryStore {
    private readonly memoryPath;
    constructor(memoryPath?: string);
    /**
     * 写入记忆
     */
    write(type: string, data: any): Promise<void>;
    /**
     * 读取记忆 (按类型)
     */
    read(type: string, limit?: number): any[];
    /**
     * 搜索记忆
     */
    search(query: string, limit?: number): any[];
    /**
     * 清除记忆
     */
    clear(): void;
}
