namespace AIPlantHealthCheck.Models;

/// <summary>
/// 植物信息实体
/// </summary>
public class Plant
{
    public int Id { get; set; }
    
    /// <summary>
    /// 植物名称
    /// </summary>
    public required string Name { get; set; }
    
    /// <summary>
    /// 植物种类
    /// </summary>
    public required string Species { get; set; }
    
    /// <summary>
    /// 健康状态
    /// </summary>
    public required string HealthStatus { get; set; }
    
    /// <summary>
    /// 最后检测时间
    /// </summary>
    public DateTime? LastCheckTime { get; set; }
    
    /// <summary>
    /// 备注
    /// </summary>
    public string? Notes { get; set; }
    
    /// <summary>
    /// 创建时间
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
