using Microsoft.EntityFrameworkCore;
using AIPlantHealthCheck.Models;

namespace AIPlantHealthCheck.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Plant> Plants { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Configure Plant entity
        modelBuilder.Entity<Plant>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Species).IsRequired().HasMaxLength(200);
            entity.Property(e => e.HealthStatus).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Notes).HasMaxLength(1000);
            entity.HasIndex(e => e.Name);
        });
    }
}
