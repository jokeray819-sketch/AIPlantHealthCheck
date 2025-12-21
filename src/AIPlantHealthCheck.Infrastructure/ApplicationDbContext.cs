using AIPlantHealthCheck.Domain.AggregatesModel.OrderAggregate;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NetCorePal.Extensions.DistributedTransactions.CAP.Persistence;
using AIPlantHealthCheck.Domain.AggregatesModel.DeliverAggregate;

namespace AIPlantHealthCheck.Infrastructure;

public partial class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, IMediator mediator)
    : AppDbContextBase(options, mediator)
    , IMySqlCapDataStorage
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        if (modelBuilder is null)
        {
            throw new ArgumentNullException(nameof(modelBuilder));
        }

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }


    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        ConfigureStronglyTypedIdValueConverter(configurationBuilder);
        base.ConfigureConventions(configurationBuilder);
    }

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<DeliverRecord> DeliverRecords => Set<DeliverRecord>();
}
